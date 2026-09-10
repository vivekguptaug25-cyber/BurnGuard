import os

from dotenv import load_dotenv

load_dotenv()


def generate_engineering_report(analysis):
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return (
            "AI report unavailable: GROQ_API_KEY is not configured. "
            "The ML anomaly analysis is still available."
        )

    try:
        from groq import Groq
    except ImportError:
        return "AI report unavailable: install the groq package in the ML service environment."

    client = Groq(api_key=api_key)

    prompt = f"""
You are an expert semiconductor reliability engineer.

You are assisting BurnGuard, an AI-driven component burn-in and screening system.
Analyze ONLY the information provided below.

Component: {analysis["component_type"]}
Temperature: {analysis["temperature"]} °C
Voltage: {analysis["voltage"]} V
Current: {analysis["current"]} A
Power: {analysis["power"]} W
Anomaly score: {analysis["anomaly_score"]}
Failure risk: {analysis["failure_risk"]}%
Risk level: {analysis["risk_level"]}
Parameter statuses: {analysis["parameter_status"]}

Provide a concise engineering assessment containing:
1. Overall condition
2. Most likely cause
3. Important abnormal parameters
4. Recommended action
5. Whether additional burn-in testing is recommended

Do not invent measurements.
Do not claim certainty.
Clearly distinguish detected behavior from possible causes.
"""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": "You are a semiconductor reliability engineer.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
        )
        return response.choices[0].message.content
    except Exception as exc:
        return f"AI report unavailable: {exc}"
