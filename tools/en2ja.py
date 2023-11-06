from transformers import pipeline

model = pipeline("translation",  model="Helsinki-NLP/opus-tatoeba-en-ja", device=0)

while True:
    try:
        text = input("")
        print(model(text))
    except KeyboardInterrupt:
        print("")
        break
    except Exception as e:
        print(e)
        break

