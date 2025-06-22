from openai import OpenAI
from dotenv import load_dotenv
import os

# Load environment and set up client
load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

LLM_MODEL = "gpt-3.5-turbo"  # or "gpt-4" if you're using GPT-4

def get_llm_response(user_query: str, context: str, chat_history: list[dict]) -> str:
    try:
        # Format chat history into readable dialogue
        formatted_history = "\n".join(
            [f"{msg['role'].capitalize()}: {msg['content']}" for msg in chat_history]
        )

        # System prompt focused on ReAct-based analytical behavior
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

        # User prompt containing query and context
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

        # Call OpenAI API
        response = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {"role": "system", "content": system_prompt.strip()},
                {"role": "user", "content": user_prompt.strip()}
            ],
            temperature=0.4
        )

        return response.choices[0].message.content

    except Exception as e:
        print(f"[ERROR] get_llm_response: {e}")
        return "There was an error processing your request."
