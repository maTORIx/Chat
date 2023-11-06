from transformers import pipeline
import readline

model = pipeline("translation",  model="Helsinki-NLP/opus-mt-ja-en", device=0)

while True:
    try:
        text = input("")
        print(model(text)[0]["translation_text"])
    except KeyboardInterrupt:
        print("")
        break
    except Exception as e:
        print(e)
        break


