
from contextlib import asynccontextmanager
from pathlib import Path
import pickle

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
import keras
pad_sequences = keras.utils.pad_sequences


# --------------------------------------------------
# 1. Paths and model configuration
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent
ARTIFACTS_DIR = BASE_DIR / "artifacts"

MODEL_PATH = ARTIFACTS_DIR / "BIGRU_Modle (1).keras"
TOKENIZER_PATH = ARTIFACTS_DIR / "tokenizer (1).pkl"
STATIC_DIR = BASE_DIR / "static"

MAX_SEQUENCE_LENGTH = 50

# These labels match the order in your notebook.
EMOTION_LABELS = [
    "sadness",
    "joy",
    "love",
    "anger",
    "fear",
    "surprise",
]

EMOTION_EMOJIS = {
    "sadness": "😢",
    "joy": "😄",
    "love": "❤️",
    "anger": "😠",
    "fear": "😨",
    "surprise": "😲",
}


# --------------------------------------------------
# 2. Request and response schemas
# --------------------------------------------------

class TextInput(BaseModel):
    text: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="The sentence whose emotion you want to predict.",
        example="I feel so happy and excited",
    )


class PredictionResponse(BaseModel):
    text: str
    predicted_emotion: str
    emoji: str
    confidence: float
    all_probabilities: dict[str, float]


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool


# --------------------------------------------------
# 3. Load model and tokenizer at startup
# --------------------------------------------------

resources = {
    "model": None,
    "tokenizer": None,
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Loading BIGRU model and tokenizer...")

    try:
        if not MODEL_PATH.is_file():
            raise FileNotFoundError(
                f"Model file not found: {MODEL_PATH}"
            )

        if not TOKENIZER_PATH.is_file():
            raise FileNotFoundError(
                f"Tokenizer file not found: {TOKENIZER_PATH}"
            )

        resources["model"] = keras.models.load_model(
            str(MODEL_PATH),
            compile=False,
        )

        with open(TOKENIZER_PATH, "rb") as file:
            resources["tokenizer"] = pickle.load(file)

        # Check that the model returns six emotion scores.
        output_shape = resources["model"].output_shape

        if output_shape[-1] != len(EMOTION_LABELS):
            raise ValueError(
                f"Model has {output_shape[-1]} outputs, "
                f"but {len(EMOTION_LABELS)} emotion labels "
                "are configured. Check the training notebook."
            )

        print("BIGRU model and tokenizer loaded successfully.")

        yield

    finally:
        resources["model"] = None
        resources["tokenizer"] = None
        print("Model resources released.")


# --------------------------------------------------
# 4. Create FastAPI application
# --------------------------------------------------

app = FastAPI(
    title="Emotion Prediction API",
    description="Predict emotions from text using a trained BiGRU model.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

if STATIC_DIR.is_dir():
    app.mount(
        "/static",
        StaticFiles(directory=str(STATIC_DIR)),
        name="static",
    )


# --------------------------------------------------
# 5. Health check endpoint
# --------------------------------------------------

@app.get("/health", response_model=HealthResponse)
def health_check():
    loaded = (
        resources["model"] is not None
        and resources["tokenizer"] is not None
    )

    return HealthResponse(
        status="Server is running",
        model_loaded=loaded,
    )


# --------------------------------------------------
# 6. Predict emotion endpoint
# --------------------------------------------------

@app.post("/predict", response_model=PredictionResponse)
def predict_emotion(text_input: TextInput):

    model = resources["model"]
    tokenizer = resources["tokenizer"]

    if model is None or tokenizer is None:
        raise HTTPException(
            status_code=503,
            detail="Model or tokenizer is not loaded.",
        )

    original_text = text_input.text.strip()

    if not original_text:
        raise HTTPException(
            status_code=422,
            detail="Please enter a non-empty sentence.",
        )

    try:
        # The notebook trained the tokenizer on raw text.
        # Keras Tokenizer handles lowercasing and filtering.
        sequences = tokenizer.texts_to_sequences(
            [original_text]
        )

        padded_sequence = pad_sequences(
            sequences,
            maxlen=MAX_SEQUENCE_LENGTH,
            padding="post",
            truncating="post",
        )

        predictions = model.predict(
            padded_sequence,
            verbose=0,
        )[0]

        predictions = np.asarray(
            predictions,
            dtype=np.float64,
        )

        if (
            predictions.ndim != 1
            or len(predictions) != len(EMOTION_LABELS)
            or not np.all(np.isfinite(predictions))
        ):
            raise ValueError(
                "The model returned invalid prediction scores."
            )

        top_index = int(np.argmax(predictions))
        predicted_emotion = EMOTION_LABELS[top_index]

        all_probabilities = {
            label: float(probability)
            for label, probability in zip(
                EMOTION_LABELS,
                predictions,
            )
        }

        return PredictionResponse(
            text=original_text,
            predicted_emotion=predicted_emotion,
            emoji=EMOTION_EMOJIS[predicted_emotion],
            confidence=float(predictions[top_index]),
            all_probabilities=all_probabilities,
        )

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {error}",
        ) from error


# --------------------------------------------------
# 7. Optional homepage
# --------------------------------------------------

@app.get("/", include_in_schema=False)
def homepage():
    index_file = STATIC_DIR / "index.html"

    if index_file.is_file():
        return FileResponse(str(index_file))

    return {
        "message": "Emotion Prediction API is running.",
        "docs": "/docs",
        "health": "/health",
    }
