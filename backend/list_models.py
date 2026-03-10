import google.generativeai as genai

def list_models():
    api_key = "AIzaSyBFrjwRBBkEUv96Ztp7-RVS6Mf7IMNlY8E"
    genai.configure(api_key=api_key)
    
    print("Available models:")
    try:
        for model in genai.list_models():
            if 'generateContent' in model.supported_generation_methods:
                print(model.name)
    except Exception as e:
        print(f"Error listing models: {e}")

if __name__ == "__main__":
    list_models()
