import argparse
import json
import os
import time
from typing import Dict, Iterable, List, Optional, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
from sklearn.preprocessing import LabelEncoder
import requests

# Import xgboost after sklearn so users see clearer error if missing
try:
    from xgboost import XGBClassifier
except Exception as exc:  # pragma: no cover
    raise RuntimeError(
        "xgboost is required. Please install with `pip install xgboost`."
    ) from exc


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Train a mood classification model using Spotify MPD labels and a "
            "precompiled Spotify audio features CSV."
        )
    )
    parser.add_argument(
        "--mpd-dir",
        type=str,
        default=None,
        help=(
            "Path to MPD 'data' directory containing JSON slices. "
            "Defaults to ML Training/data/spotify_million_playlist_dataset/data"
        ),
    )
    parser.add_argument(
        "--features-csv",
        type=str,
        required=False,
        default=None,
        help=(
            "Path to a CSV with columns: track_uri, danceability, energy, key, "
            "loudness, mode, speechiness, acousticness, instrumentalness, liveness, "
            "valence, tempo."
        ),
    )
    parser.add_argument(
        "--spotify-client-id",
        type=str,
        default=os.environ.get("SPOTIFY_CLIENT_ID"),
        help="Spotify API Client ID (env SPOTIFY_CLIENT_ID if not provided)",
    )
    parser.add_argument(
        "--spotify-client-secret",
        type=str,
        default=os.environ.get("SPOTIFY_CLIENT_SECRET"),
        help="Spotify API Client Secret (env SPOTIFY_CLIENT_SECRET if not provided)",
    )
    parser.add_argument(
        "--generated-features-csv",
        type=str,
        default=None,
        help=(
            "Where to save generated features CSV when fetching via Spotify API. "
            "Defaults to ML Training/data/generated_spotify_features.csv"
        ),
    )
    parser.add_argument(
        "--spotify-batch-size",
        type=int,
        default=100,
        help="Batch size for Spotify audio-features requests (1-100, default 100)",
    )
    parser.add_argument(
        "--max-files",
        type=int,
        default=None,
        help=(
            "Optional cap on number of MPD JSON files to process for faster runs."
        ),
    )
    parser.add_argument(
        "--test-size",
        type=float,
        default=0.2,
        help="Test split size for train/test split (default: 0.2)",
    )
    parser.add_argument(
        "--random-state",
        type=int,
        default=42,
        help="Random state for reproducibility (default: 42)",
    )
    parser.add_argument(
        "--n-estimators",
        type=int,
        default=300,
        help="XGBoost number of trees (default: 300)",
    )
    parser.add_argument(
        "--learning-rate",
        type=float,
        default=0.1,
        help="XGBoost learning rate (default: 0.1)",
    )
    parser.add_argument(
        "--max-depth",
        type=int,
        default=6,
        help="XGBoost tree max depth (default: 6)",
    )
    return parser


MOOD_MAP: Dict[str, List[str]] = {
    "Happy/Energetic": ["happy", "joy", "party", "upbeat", "summer", "dance"],
    "Sad/Reflective": ["sad", "melancholy", "breakup", "rainy", "lost", "alone"],
    "Calm/Focus": [
        "chill",
        "relax",
        "calm",
        "focus",
        "study",
        "peaceful",
        "sleep",
        "acoustic",
    ],
    "Angry/Intense": ["angry", "rage", "workout", "intense", "power", "gym"],
}


FEATURE_COLUMNS: List[str] = [
    "danceability",
    "energy",
    "key",
    "loudness",
    "mode",
    "speechiness",
    "acousticness",
    "instrumentalness",
    "liveness",
    "valence",
    "tempo",
]


def infer_default_paths(script_dir: str) -> Tuple[str, str]:
    # MPD JSON slices directory
    mpd_dir_default = os.path.join(
        script_dir,
        "data",
        "spotify_million_playlist_dataset",
        "data",
    )
    # Backend models directory (sibling of "ML Training")
    repo_root = os.path.dirname(script_dir)
    backend_models_dir = os.path.join(repo_root, "backend", "models")
    return mpd_dir_default, backend_models_dir


def load_dotenv_if_exists(paths: List[str]) -> None:
    encodings = ["utf-8", "utf-8-sig", "utf-16", "cp1252"]
    for path in paths:
        if not os.path.isfile(path):
            continue
        loaded_count = 0
        last_error: Optional[Exception] = None
        for enc in encodings:
            try:
                with open(path, "r", encoding=enc) as f:
                    for raw_line in f:
                        line = raw_line.strip()
                        if not line or line.startswith("#") or "=" not in line:
                            continue
                        key, value = line.split("=", 1)
                        key = key.strip()
                        value = value.strip().strip('"').strip("'")
                        if key and value and key not in os.environ:
                            os.environ[key] = value
                            loaded_count += 1
                last_error = None
                break
            except Exception as exc:  # try next encoding
                last_error = exc
                continue
        if loaded_count > 0:
            print(f"Loaded {loaded_count} env var(s) from: {path}")
        elif last_error is not None:
            print(f"Warning: Could not read .env at {path}: {type(last_error).__name__}")


def extract_track_id_from_uri(track_uri: str) -> Optional[str]:
    # Expect formats like 'spotify:track:<id>' or 'https://open.spotify.com/track/<id>'
    if not isinstance(track_uri, str):
        return None
    if track_uri.startswith("spotify:track:"):
        return track_uri.split(":")[-1]
    if "open.spotify.com/track/" in track_uri:
        part = track_uri.split("open.spotify.com/track/")[-1]
        return part.split("?")[0].split("/")[0]
    # If raw ID is provided
    if len(track_uri) >= 10 and ":" not in track_uri and "/" not in track_uri:
        return track_uri
    return None


def normalize_text(value: str) -> str:
    return value.lower().strip() if isinstance(value, str) else ""


def label_for_playlist_name(playlist_name: str, mood_map: Dict[str, List[str]]) -> Optional[str]:
    name_norm = normalize_text(playlist_name)
    for mood_label, keywords in mood_map.items():
        for keyword in keywords:
            if keyword in name_norm:
                return mood_label
    return None


def iter_mpd_files(mpd_dir: str, max_files: Optional[int] = None) -> Iterable[str]:
    files = [
        os.path.join(mpd_dir, f)
        for f in os.listdir(mpd_dir)
        if f.endswith(".json")
    ]
    files.sort()
    if max_files is not None:
        files = files[:max_files]
    for path in files:
        yield path


def build_labeled_tracks_dataframe(
    mpd_dir: str,
    mood_map: Dict[str, List[str]],
    max_files: Optional[int] = None,
) -> pd.DataFrame:
    labeled_rows: List[Tuple[str, str]] = []
    total_playlists = 0
    labeled_playlists = 0

    for idx, json_path in enumerate(iter_mpd_files(mpd_dir, max_files=max_files)):
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        playlists = data.get("playlists", [])
        total_playlists += len(playlists)

        for pl in playlists:
            name = pl.get("name", "")
            mood_label = label_for_playlist_name(name, mood_map)
            if mood_label is None:
                continue
            labeled_playlists += 1

            tracks = pl.get("tracks", [])
            for t in tracks:
                track_uri = t.get("track_uri")
                if not track_uri:
                    continue
                labeled_rows.append((track_uri, mood_label))

        if (idx + 1) % 50 == 0:
            print(
                f"Processed {idx + 1} JSON files; "
                f"playlists so far: {total_playlists:,}, labeled playlists: {labeled_playlists:,}, "
                f"labeled tracks: {len(labeled_rows):,}"
            )

    if not labeled_rows:
        print("Warning: No labeled tracks were found from playlist names.")

    df = pd.DataFrame(labeled_rows, columns=["track_uri", "mood_label"]).drop_duplicates()
    return df


def _standardize_track_uri(value: object) -> Optional[str]:
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return None
    s = str(value).strip()
    tid = extract_track_id_from_uri(s)
    if not tid:
        return None
    return f"spotify:track:{tid}"


def _ensure_track_uri_column(df: pd.DataFrame) -> pd.DataFrame:
    colmap = {c.lower(): c for c in df.columns}
    candidate_order = [
        "track_uri",
        "uri",
        "spotify_uri",
        "spotify_track_uri",
        "trackid",
        "track_id",
        "spotify_id",
        "spotify_track_id",
        "id",
    ]
    chosen_src: Optional[str] = None
    for k in candidate_order:
        if k in colmap:
            chosen_src = colmap[k]
            break
    if chosen_src is None:
        raise ValueError(
            "Features CSV must contain a Spotify identifier column. "
            "Accepted names: track_uri, uri, spotify_uri, track_id, spotify_id, id"
        )

    # Build standardized track_uri column
    df = df.copy()
    df["track_uri"] = df[chosen_src].map(_standardize_track_uri)
    return df


def load_features_csv(features_csv_path: str) -> pd.DataFrame:
    if not os.path.isfile(features_csv_path):
        raise FileNotFoundError(
            f"Features CSV not found: {features_csv_path}. Provide --features-csv pointing to a valid file."
        )
    df = pd.read_csv(features_csv_path)

    # Ensure there is a standardized 'track_uri' column regardless of original naming
    df = _ensure_track_uri_column(df)

    missing_cols = [c for c in FEATURE_COLUMNS if c not in df.columns]
    if missing_cols:
        raise ValueError(
            "Features CSV is missing expected columns: " + ", ".join(missing_cols)
        )
    # Drop feature rows with NA in any feature column and missing URI
    df = df.dropna(subset=["track_uri"] + FEATURE_COLUMNS)
    # Keep only required columns
    out = df[["track_uri"] + FEATURE_COLUMNS].copy()
    # Remove duplicates on track_uri to avoid many-to-one merge issues
    out = out.drop_duplicates(subset=["track_uri"])
    print(
        f"Features CSV parsed: {len(out):,} rows after standardizing URIs and dropping NAs/dupes"
    )
    return out


def request_spotify_token(client_id: str, client_secret: str) -> str:
    print(f"--- DEBUG: Client ID being sent: '{client_id}'")
    print(f"--- DEBUG: Client Secret being sent: '{client_secret}'")

    auth_string = f"{client_id}:{client_secret}"
    resp = requests.post(
        "https://accounts.spotify.com/api/token",
        data={"grant_type": "client_credentials"},
        auth=(client_id, client_secret),
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()
    return data["access_token"]


def fetch_audio_features_for_tracks(
    track_uris: List[str],
    client_id: str,
    client_secret: str,
    sleep_on_rate_limit: float = 2.0,
    batch_size: int = 100,
) -> pd.DataFrame:
    if not track_uris:
        return pd.DataFrame(columns=["track_uri"] + FEATURE_COLUMNS)

    access_token = request_spotify_token(client_id, client_secret)
    headers = {"Authorization": f"Bearer {access_token}"}

    # Map Spotify ID -> track_uri to preserve original uris
    ids: List[str] = []
    uri_by_id: Dict[str, str] = {}
    for uri in track_uris:
        tid = extract_track_id_from_uri(uri)
        if tid and tid not in uri_by_id:
            uri_by_id[tid] = uri
            ids.append(tid)

    records: List[Dict[str, object]] = []
    if batch_size < 1:
        batch_size = 1
    if batch_size > 100:
        batch_size = 100
    for i in range(0, len(ids), batch_size):
        batch = ids[i : i + batch_size]
        params = {"ids": ",".join(batch)}
        while True:
            resp = requests.get(
                "https://api.spotify.com/v1/audio-features",
                headers=headers,
                params=params,
                timeout=20,
            )
            if resp.status_code == 429:
                retry_after = float(resp.headers.get("Retry-After", sleep_on_rate_limit))
                time.sleep(retry_after)
                continue
            if resp.status_code == 401:  # token may have expired
                access_token = request_spotify_token(client_id, client_secret)
                headers = {"Authorization": f"Bearer {access_token}"}
                continue
            if resp.status_code == 403:
                # Fallback: try per-track endpoint for this batch
                for single_id in batch:
                    single_url = f"https://api.spotify.com/v1/audio-features/{single_id}"
                    while True:
                        single_resp = requests.get(single_url, headers=headers, timeout=20)
                        if single_resp.status_code == 429:
                            retry_after = float(single_resp.headers.get("Retry-After", sleep_on_rate_limit))
                            time.sleep(retry_after)
                            continue
                        if single_resp.status_code == 401:
                            access_token = request_spotify_token(client_id, client_secret)
                            headers = {"Authorization": f"Bearer {access_token}"}
                            continue
                        if single_resp.status_code == 403:
                            # Give up on this track
                            break
                        single_resp.raise_for_status()
                        feat = single_resp.json()
                        if feat and isinstance(feat, dict):
                            tid = feat.get("id")
                            if tid and tid in uri_by_id:
                                row = {
                                    "track_uri": uri_by_id[tid],
                                    "danceability": feat.get("danceability"),
                                    "energy": feat.get("energy"),
                                    "key": feat.get("key"),
                                    "loudness": feat.get("loudness"),
                                    "mode": feat.get("mode"),
                                    "speechiness": feat.get("speechiness"),
                                    "acousticness": feat.get("acousticness"),
                                    "instrumentalness": feat.get("instrumentalness"),
                                    "liveness": feat.get("liveness"),
                                    "valence": feat.get("valence"),
                                    "tempo": feat.get("tempo"),
                                }
                                records.append(row)
                        break
                # Continue to next batch after per-track attempts
                break
            resp.raise_for_status()
            break

        data = resp.json().get("audio_features", [])
        for feat in data:
            if not feat:
                continue
            tid = feat.get("id")
            if not tid or tid not in uri_by_id:
                continue
            row = {
                "track_uri": uri_by_id[tid],
                "danceability": feat.get("danceability"),
                "energy": feat.get("energy"),
                "key": feat.get("key"),
                "loudness": feat.get("loudness"),
                "mode": feat.get("mode"),
                "speechiness": feat.get("speechiness"),
                "acousticness": feat.get("acousticness"),
                "instrumentalness": feat.get("instrumentalness"),
                "liveness": feat.get("liveness"),
                "valence": feat.get("valence"),
                "tempo": feat.get("tempo"),
            }
            records.append(row)

    df = pd.DataFrame.from_records(records)
    if not df.empty:
        df = df.dropna(subset=["track_uri"])  # keep only rows with a uri
    # Ensure all expected columns present
    for col in FEATURE_COLUMNS:
        if col not in df.columns:
            df[col] = np.nan
    return df[["track_uri"] + FEATURE_COLUMNS]


def train_model(
    merged_df: pd.DataFrame,
    test_size: float,
    random_state: int,
    n_estimators: int,
    learning_rate: float,
    max_depth: int,
) -> Tuple[XGBClassifier, LabelEncoder, pd.DataFrame]:
    # Encode labels
    label_encoder = LabelEncoder()
    y = label_encoder.fit_transform(merged_df["mood_label"].values)
    X = merged_df[FEATURE_COLUMNS].astype(float).values

    # Train/test split
    try:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=random_state, stratify=y
        )
    except ValueError:
        # Fallback when any class has too few samples
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=random_state
        )

    # Define XGBoost classifier
    clf = XGBClassifier(
        n_estimators=n_estimators,
        learning_rate=learning_rate,
        max_depth=max_depth,
        subsample=0.9,
        colsample_bytree=0.9,
        objective="multi:softprob",
        eval_metric="mlogloss",
        random_state=random_state,
        n_jobs=os.cpu_count() or 1,
        tree_method="hist",
        reg_lambda=1.0,
    )

    clf.fit(X_train, y_train)

    # Evaluate
    y_pred = clf.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"Test Accuracy: {acc:.4f}")
    print("Classification Report:")
    target_names = label_encoder.inverse_transform(sorted(np.unique(y)))
    # Ensure consistent order with encoded labels
    print(
        classification_report(
            y_test,
            y_pred,
            target_names=[label_encoder.inverse_transform([i])[0] for i in range(len(target_names))],
            digits=4,
        )
    )

    return clf, label_encoder, pd.DataFrame({
        "y_test": y_test,
        "y_pred": y_pred,
    })


def ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    # Load .env from repo root and ML Training dir before reading args
    repo_root = os.path.dirname(script_dir)
    load_dotenv_if_exists([
        os.path.join(repo_root, ".env"),
        os.path.join(script_dir, ".env"),
    ])

    parser = build_arg_parser()
    args = parser.parse_args()

    default_mpd_dir, backend_models_dir = infer_default_paths(script_dir)

    mpd_dir = args.mpd_dir or default_mpd_dir
    features_csv = args.features_csv or os.environ.get("FEATURES_CSV")

    print(f"MPD directory: {mpd_dir}")
    if not os.path.isdir(mpd_dir):
        raise FileNotFoundError(
            f"MPD directory not found: {mpd_dir}. Check the path or use --mpd-dir."
        )

    # Determine generated features CSV default path
    generated_csv_default = os.path.join(script_dir, "data", "generated_spotify_features.csv")
    generated_csv_path = args.generated_features_csv or generated_csv_default

    if features_csv:
        print(f"Features CSV: {features_csv}")

    # 1) Label tracks from MPD playlists based on playlist name keywords
    labeled_df = build_labeled_tracks_dataframe(
        mpd_dir=mpd_dir,
        mood_map=MOOD_MAP,
        max_files=args.max_files,
    )
    print(
        f"Labeled tracks: {len(labeled_df):,} | Unique tracks: {labeled_df['track_uri'].nunique():,}"
    )

    if labeled_df.empty:
        raise RuntimeError(
            "No labeled tracks were produced. Consider increasing --max-files or adjusting MOOD_MAP."
        )

    # 2) Load or fetch features and merge
    if not features_csv:
        if not args.spotify_client_id or not args.spotify_client_secret:
            raise ValueError(
                "No features CSV provided and Spotify credentials missing. "
                "Provide --features-csv or set --spotify-client-id/--spotify-client-secret (or envs)."
            )
        print("No features CSV provided; fetching audio features from Spotify API...")
        # Fetch features for the unique labeled track URIs
        unique_uris = labeled_df["track_uri"].dropna().unique().tolist()
        fetched_df = fetch_audio_features_for_tracks(
            track_uris=unique_uris,
            client_id=args.spotify_client_id,
            client_secret=args.spotify_client_secret,
            batch_size=args.spotify_batch_size,
        )
        if fetched_df.empty:
            raise RuntimeError("Failed to fetch any audio features from Spotify for the labeled tracks.")
        # Save for reuse
        os.makedirs(os.path.dirname(generated_csv_path), exist_ok=True)
        fetched_df.to_csv(generated_csv_path, index=False)
        print(f"Saved generated features to: {generated_csv_path}")
        features_df = fetched_df
    else:
        features_df = load_features_csv(features_csv)
    print(
        f"Loaded features: {len(features_df):,} rows | Unique tracks: {features_df['track_uri'].nunique():,}"
    )

    merged = pd.merge(labeled_df, features_df, on="track_uri", how="inner")
    merged = merged.dropna(subset=["mood_label"] + FEATURE_COLUMNS)
    print(
        f"Merged labeled+features: {len(merged):,} rows | Unique tracks: {merged['track_uri'].nunique():,}"
    )

    if merged.empty:
        raise RuntimeError(
            "After merge, no samples remain. Ensure your features CSV uses Spotify 'track_uri' and overlaps with MPD."
        )

    # 3) Train model
    model, label_encoder, eval_df = train_model(
        merged_df=merged,
        test_size=args.test_size,
        random_state=args.random_state,
        n_estimators=args.n_estimators,
        learning_rate=args.learning_rate,
        max_depth=args.max_depth,
    )

    # 4) Save artifacts for backend usage
    ensure_dir(backend_models_dir)
    model_path = os.path.join(backend_models_dir, "mood_classifier.joblib")
    le_path = os.path.join(backend_models_dir, "mood_label_encoder.joblib")
    joblib.dump(model, model_path)
    joblib.dump(label_encoder, le_path)
    print(f"Saved model to: {model_path}")
    print(f"Saved label encoder to: {le_path}")


if __name__ == "__main__":
    main()


