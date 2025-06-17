from openai import AzureOpenAI
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

print(f"AZURE_OPENAI_ENDPOINT: {os.getenv('AZURE_OPENAI_ENDPOINT')}")
print(f"AZURE_DEPLOYMENT_NAME: {os.getenv('AZURE_DEPLOYMENT_NAME')}")
print(f"API_KEY exists: {bool(os.getenv('AZURE_OPENAI_API_KEY'))}")

client = AzureOpenAI(
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    api_version="2025-01-01-preview",
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT")
)


AZURE_DEPLOYMENT_NAME = "gpt-4o-mini"

def get_llm_response(user_query: str, context: dict, chat_history: list[dict]) -> str:
    try:
        formatted_history = "\n".join(
            [f"{msg['role'].capitalize()}: {msg['content']}" for msg in chat_history]
        )

        system_prompt = """
        You are a helpful, knowledgeable, and reflective assistant that responds naturally and conversationally to questions. 
        You must always answer using only the information provided in the context. If the context does not contain the necessary information, 
        respond honestly and politely say the answer is not available.

        Guidelines:
        - Do not restate or analyze the user’s question in third person.
        - Speak directly and naturally, as if you are having a conversation with the user.
        - Use reasoning to unpack or explain complex ideas (ReAct style), but do so clearly and conversationally.
        - If the user’s query is ambiguous or missing necessary detail, ask a thoughtful follow-up based on the conversation history.

        You may use general knowledge to interpret terms or offer relevant analogies, but not to fabricate or assume missing details.
        Keep the tone intelligent, supportive, and focused on the given context.
        """

        user_prompt = f"""
        Context:
        {context}

        Conversation So Far:
        {formatted_history}

        User’s Question:
        {user_query}

        Using only the information in the context (and the tone of the conversation so far), answer the user’s question naturally and directly. 
        If something is unclear or missing, ask the user a clarifying question instead of making assumptions.
        """

        response = client.chat.completions.create(
            model=AZURE_DEPLOYMENT_NAME,
            messages=[
                {"role": "system", "content": system_prompt.strip()},
                {"role": "user", "content": user_prompt.strip()}
            ],
            temperature=0.4
        )

        return response.choices[0].message.content.strip()

    except Exception as e:
        print(f"[ERROR] get_llm_response: {e}")
        return "There was an error processing your request."

