import os
import json
import boto3
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


def configure_bedrock_client():
    """
    Configure and return an AWS Bedrock Runtime client.
    Credentials are read from environment variables defined in .env:
        - AWS_BEARER_TOKEN_BEDROCK : bearer token for authentication
        - AWS_REGION               : AWS region (default: us-east-1)
    """
    bearer_token = os.getenv("AWS_BEARER_TOKEN_BEDROCK")
    aws_region = os.getenv("AWS_REGION", "us-east-1")

    if not bearer_token:
        raise EnvironmentError(
            "AWS_BEARER_TOKEN_BEDROCK is not set. "
            "Please add it to your .env file."
        )

    # boto3 session using the bearer token passed as an AWS token
    session = boto3.Session(region_name=aws_region)
    client = session.client(
        service_name="bedrock-runtime",
        region_name=aws_region,
        # Bearer token is supplied via the aws_session_token field
        aws_access_key_id="BEDROCK",           # placeholder required by boto3
        aws_secret_access_key="BEDROCK",       # placeholder required by boto3
        aws_session_token=bearer_token,
    )

    return client


def get_ai_recommendation(
    destination: str,
    days: int,
    budget: float,
    travel_style: str = "Standard",
) -> str:
    """
    Generate a travel itinerary using AWS Bedrock.

    Args:
        destination  (str)   : Travel destination.
        days         (int)   : Number of days for the trip.
        budget       (float) : Total budget in USD.
        travel_style (str)   : Travel style (e.g. Backpacker, Standard, Luxury).

    Returns:
        str: AI-generated itinerary text.
    """
    prompt = f"""
You are an expert travel planner. Create a detailed and structured daily travel itinerary based on these details:

Trip Details:
- Destination: {destination}
- Duration: {days} days
- Total Budget: USD {budget}
- Travel Style: {travel_style}

For EACH day of the trip, you MUST structure the output into three specific time periods with these requirements:

1. Morning:
- Provide 2-3 specific morning activities (e.g., early sightseeing, breakfast spot, or morning walk).

2. Afternoon:
- Focus on cultural sites (e.g., temples, museums, historical landmarks) and immersive local experiences.

3. Evening:
- Suggest specific dinner spots (e.g., local eateries, markets, or authentic restaurants).
- Recommend vibrant local nightlife or evening activities suited for the travel style.

Formatting Instructions:
- Format the response in Markdown using headers (## for Days, ### for Morning/Afternoon/Evening) and bullet lists (-).
- Include estimated daily expenses and transportation tips where relevant.
"""

    model_id = os.getenv("MODEL_ID", "amazon.nova-lite-v1:0")
    client = configure_bedrock_client()

    body = json.dumps({
        "messages": [
            {
                "role": "user",
                "content": [{"text": prompt}],
            }
        ],
        "inferenceConfig": {
            "maxTokens": 2048,
            "temperature": 0.7,
        },
    })

    try:
        response = client.invoke_model(
            modelId=model_id,
            body=body,
            contentType="application/json",
            accept="application/json",
        )

        response_body = json.loads(response["body"].read())

        # Amazon Nova / Converse-style response shape
        return response_body["output"]["message"]["content"][0]["text"]

    except Exception as e:
        print(f"[bedrock_service] Error calling AWS Bedrock: {e}")
        raise
