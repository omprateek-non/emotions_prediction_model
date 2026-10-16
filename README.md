# Emotion Knower

**An NLP-based emotion detection application that identifies the emotion expressed in a piece of text.**

Emotion Knower is a project I built out of my interest in emotional intelligence and the way people express their feelings through language. I wanted to explore how machine learning could be used to recognize emotions in text and turn that idea into a simple, usable application.

The project brings together NLP, deep learning, and web development to create an application that predicts the emotion behind a given piece of text.

## Why I Built This

I've always been interested in human psychology, emotional intelligence, and how people communicate their emotions. We don't always express what we feel directly, and sometimes the language we use can reveal more than we intend.

This curiosity led me to explore emotion detection using machine learning. Rather than keeping it as a theoretical idea, I decided to train a model and build a working application around it.

## How It Works

Users enter a sentence or a piece of text, and the application processes it to predict the emotion expressed in the text. It then displays the predicted emotion along with its confidence score and the probability distribution across the available emotion classes.

## Tech Stack

- **Python** — Core development and model integration
- **TensorFlow / Keras** — Deep learning model training and inference
- **NLP** — Text preprocessing and emotion classification
- **BiGRU (Bidirectional Gated Recurrent Unit)** — Sequence modelling for text classification
- **FastAPI** — Backend API and model serving
- **HTML, CSS, JavaScript** — Frontend interface
- **Render** — Application deployment

## Model Development

I trained the BiGRU-based deep learning model myself as part of this project. The model is used to classify text into emotion categories.

The application uses a trained model and its corresponding tokenizer to process input text and generate predictions. The backend connects the model to the frontend through a FastAPI endpoint.

The frontend was developed with the help of AI tools, which I used to assist with the interface and presentation. The model training, backend integration, and overall project implementation were part of my own development work.

## Features

- Text-based emotion prediction
- Deep learning model inference
- Confidence score for the predicted emotion
- Probability scores for available emotion classes
- Web interface for interacting with the model
- FastAPI backend for serving predictions

## Project Structure

```text
Emotion-Knower/
├── artifacts/
│   ├── BIGRU_Model.keras
│   └── tokenizer.pkl
├── static/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── main.py
├── requirements.txt
└── README.md


## What I Learned

Building this project gave me practical experience with deep learning, NLP, model inference, API development, and connecting a trained model to a frontend. It also helped me understand the work involved in taking a machine learning experiment and turning it into an application that people can interact with.

More importantly, it gave me a way to explore the intersection of technology and my interest in human emotions.

## Limitations

Emotion detection from text is not the same as understanding a person's actual emotional state. Predictions depend on the training data, the language used, and the context available to the model. The output should be treated as a prediction, not a definitive judgment about someone's feelings.

## Future Improvements

- Evaluate the model on a broader range of text and real-world examples.
- Improve performance on ambiguous and context-dependent sentences.
- Add more detailed model evaluation and error analysis.
- Improve the user experience and expand the application's capabilities.

---

Built as a personal project exploring NLP, deep learning, and emotional intelligence.
