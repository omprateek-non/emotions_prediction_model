
"use strict";

// ========================================
// 1. GET HTML ELEMENTS
// ========================================
const form = document.getElementById("emotionForm");
const textInput = document.getElementById("textInput");
const charCount = document.getElementById("charCount");
const analyzeButton = document.getElementById("analyzeButton");
const clearButton = document.getElementById("clearButton");
const reanalyzeButton = document.getElementById("reanalyzeButton");
const formError = document.getElementById("formError");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const emptyState = document.getElementById("emptyState");
const loadingState = document.getElementById("loadingState");
const predictionState = document.getElementById("predictionState");

// ========================================
// 2. EMOTION CONFIGURATION
// ========================================
const emotionDetails = {
    sadness: {
        emoji: "😢",
        descriptor: "A sadness-related signal was detected.",
        color: "#91a5e9"
    },
    joy: {
        emoji: "😄",
        descriptor: "A positive, joy-related signal was detected.",
        color: "#79e2d0"
    },
    love: {
        emoji: "♡",
        descriptor: "A warmth or affection-related signal was detected.",
        color: "#ed9bc8"
    },
    anger: {
        emoji: "↗",
        descriptor: "An anger-related signal was detected.",
        color: "#f19b86"
    },
    fear: {
        emoji: "◌",
        descriptor: "A fear or worry-related signal was detected.",
        color: "#c0a6ff"
    },
    surprise: {
        emoji: "✧",
        descriptor: "A surprise-related signal was detected.",
        color: "#e6c47d"
    }
};

const scoreColors = {
    joy: "#79e2d0",
    sadness: "#91a5e9",
    love: "#ed9bc8",
    anger: "#f19b86",
    fear: "#b4a3ff",
    surprise: "#e6c47d"
};

// ========================================
// 3. CHECK REQUIRED HTML ELEMENTS
// ========================================
if (
    !form ||
    !textInput ||
    !analyzeButton ||
    !emptyState ||
    !loadingState ||
    !predictionState
) {
    console.error(
        "Required HTML elements are missing. Check the IDs in index.html."
    );
} else {
    initializeApp();
}

function initializeApp() {
    // Character counter
    textInput.addEventListener("input", () => {
        if (charCount) {
            charCount.textContent = textInput.value.length;
        }

        hideError();
    });

    // Sample sentence buttons
    document.querySelectorAll("[data-sample]").forEach((button) => {
        button.addEventListener("click", () => {
            textInput.value = button.dataset.sample;

            if (charCount) {
                charCount.textContent = textInput.value.length;
            }

            hideError();
            textInput.focus();
        });
    });

    // Clear input
    clearButton?.addEventListener("click", () => {
        textInput.value = "";

        if (charCount) {
            charCount.textContent = "0";
        }

        hideError();
        showEmpty();
        textInput.focus();
    });

    // Reanalyze button
    reanalyzeButton?.addEventListener("click", () => {
        textInput.focus();

        textInput.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    });

    // Submit form
    form.addEventListener("submit", handleSubmit);

    // Check backend status
    checkHealth();
}

// ========================================
// 4. SEND TEXT TO FASTAPI
// ========================================
async function handleSubmit(event) {
    event.preventDefault();

    const text = textInput.value.trim();

    if (!text) {
        showError(
            "Enter a sentence first, or choose one of the sample prompts."
        );

        textInput.focus();
        return;
    }

    hideError();
    setLoading(true);

    try {
        const response = await fetch("/predict", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({ text })
        });

        const data = await response.json();

        console.log("API response:", data);

        if (!response.ok) {
            throw new Error(
                data.detail ||
                data.error ||
                `Request failed with status ${response.status}.`
            );
        }

        if (
            !data.predicted_emotion ||
            !data.all_probabilities
        ) {
            throw new Error(
                "The API response is missing prediction fields."
            );
        }

        // Display prediction on the webpage
        renderPrediction(data);

        console.log("Prediction displayed successfully.");

    } catch (error) {
        console.error("Emotion prediction error:", error);

        showEmpty();

        showError(
            error.message ||
            "Something went wrong while analyzing the text."
        );
    } finally {
        // IMPORTANT: Do not hide the prediction here.
        setLoading(false);
    }
}

// ========================================
// 5. DISPLAY EMOTION PREDICTION
// ========================================
function renderPrediction(data) {
    const emotion = String(data.predicted_emotion).toLowerCase();

    const details = emotionDetails[emotion] || {
        emoji: data.emoji || "✦",
        descriptor: "The model selected this as the dominant class.",
        color: "#a99bff"
    };

    const emotionSymbol = document.getElementById("emotionSymbol");
    const emotionName = document.getElementById("emotionName");
    const emotionDescriptor = document.getElementById("emotionDescriptor");
    const confidenceValue = document.getElementById("confidenceValue");
    const confidenceTrack = document.getElementById("confidenceTrack");
    const analyzedText = document.getElementById("analyzedText");
    const scoreList = document.getElementById("scoreList");
    const resultTimestamp = document.getElementById("resultTimestamp");

    // Check prediction output elements
    if (
        !emotionSymbol ||
        !emotionName ||
        !emotionDescriptor ||
        !confidenceValue ||
        !confidenceTrack ||
        !analyzedText ||
        !scoreList
    ) {
        throw new Error(
            "Prediction HTML elements are missing. Check index.html IDs."
        );
    }

    // Show result, hide other states
    emptyState.hidden = true;
    loadingState.hidden = true;
    predictionState.hidden = false;

    // Main emotion
    emotionSymbol.textContent = data.emoji || details.emoji;
    emotionSymbol.style.borderColor = `${details.color}55`;

    emotionName.textContent = emotion;
    emotionDescriptor.textContent = details.descriptor;

    // Confidence
    const confidence = clampProbability(data.confidence);

    confidenceValue.textContent =
        `${Math.round(confidence * 100)}%`;

    confidenceTrack.style.width = `${confidence * 100}%`;

    // Original analyzed text
    analyzedText.textContent = data.text || textInput.value.trim();

    // Sort emotion scores from highest to lowest
    const entries = Object.entries(data.all_probabilities)
        .map(([label, value]) => [label, Number(value)])
        .filter(([, value]) => Number.isFinite(value))
        .sort((a, b) => b[1] - a[1]);

    // Clear previous scores
    scoreList.replaceChildren();

    // Build score bars
    entries.forEach(([label, rawValue], index) => {
        const value = clampProbability(rawValue);

        const row = document.createElement("div");
        row.className = "score-row";
        row.style.setProperty(
            "--score-color",
            scoreColors[label] || "#a99bff"
        );

        const name = document.createElement("div");
        name.className = "score-label";

        const dot = document.createElement("span");
        dot.className = "score-mini-dot";

        const labelText = document.createElement("span");
        labelText.textContent = label;

        name.append(dot, labelText);

        const bar = document.createElement("div");
        bar.className = "score-bar";
        bar.setAttribute("role", "progressbar");
        bar.setAttribute("aria-label", `${label} model score`);
        bar.setAttribute("aria-valuemin", "0");
        bar.setAttribute("aria-valuemax", "100");
        bar.setAttribute(
            "aria-valuenow",
            String(Math.round(value * 100))
        );

        const fill = document.createElement("div");
        fill.className = "score-fill";

        bar.appendChild(fill);

        const score = document.createElement("span");
        score.className = "score-value";
        score.textContent = `${(value * 100).toFixed(1)}%`;

        row.append(name, bar, score);
        scoreList.appendChild(row);

        // Animate each score bar
        requestAnimationFrame(() => {
            setTimeout(() => {
                fill.style.width = `${value * 100}%`;
            }, 70 + index * 65);
        });
    });

    // Timestamp
    if (resultTimestamp) {
        const now = new Date();

        resultTimestamp.textContent =
            `RUN ${now.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
            }).toUpperCase()}`;
    }
}

// ========================================
// 6. HELPER FUNCTIONS
// ========================================
function clampProbability(value) {
    const number = Number(value);

    return Number.isFinite(number)
        ? Math.max(0, Math.min(1, number))
        : 0;
}

function setLoading(isLoading) {
    analyzeButton.disabled = isLoading;

    const buttonLabel = analyzeButton.querySelector(".button-label");

    if (buttonLabel) {
        buttonLabel.textContent = isLoading
            ? "Analyzing..."
            : "Analyze emotion";
    }

    loadingState.hidden = !isLoading;

    if (isLoading) {
        emptyState.hidden = true;
        predictionState.hidden = true;
    }

    // When loading ends, leave the result state unchanged.
}

function showEmpty() {
    emptyState.hidden = false;
    loadingState.hidden = true;
    predictionState.hidden = true;

    const confidenceTrack = document.getElementById("confidenceTrack");
    const scoreList = document.getElementById("scoreList");

    if (confidenceTrack) {
        confidenceTrack.style.width = "0";
    }

    if (scoreList) {
        scoreList.replaceChildren();
    }
}

function showError(message) {
    if (!formError) {
        console.error(message);
        return;
    }

    formError.textContent = message;
    formError.hidden = false;
}

function hideError() {
    if (formError) {
        formError.hidden = true;
        formError.textContent = "";
    }
}

// ========================================
// 7. CHECK FASTAPI BACKEND HEALTH
// ========================================
async function checkHealth() {
    try {
        const response = await fetch("/health", {
            headers: {
                Accept: "application/json"
            }
        });

        if (!response.ok) {
            throw new Error("Health check failed.");
        }

        const data = await response.json();

        if (data.model_loaded) {
            if (statusDot) {
                statusDot.className = "status-dot online";
            }

            if (statusText) {
                statusText.textContent = "Model online";
            }
        } else {
            if (statusDot) {
                statusDot.className = "status-dot offline";
            }

            if (statusText) {
                statusText.textContent = "Model not loaded";
            }
        }
    } catch (error) {
        console.error("Health check error:", error);

        if (statusDot) {
            statusDot.className = "status-dot offline";
        }

        if (statusText) {
            statusText.textContent = "API unavailable";
        }
    }
}
