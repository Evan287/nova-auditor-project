import boto3
import os
from dotenv import load_dotenv

#Load keys from the .env file
load_dotenv()

#2 Initialize the Bedrock client
client = boto3.client(
    service_name="bedrock-runtime",
    region_name=os.getenv("AWS_REGION"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY")
)

#3 Send a message to Nova 2 Lite
try:
    response = client.converse(
        modelId="amazon.nova-lite-v1:0",
        messages=[{"role":"user","content": [{"text": "Testing connection. Say 'System Online' if you hear me."}] }]
    )
    answer = response['output']['message']['content'][0]['text']
    print(f"--- SUCCESS ---")
    print(f"Nova says: {answer}")
except Exception as e:
    print(f"--- CONNECTION FAILED ---")
    print(f"Error: {e}")