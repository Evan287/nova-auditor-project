import boto3
import os
from dotenv import load_dotenv

load_dotenv()

# Change this to a unique name if it's already taken

BUCKET_NAME = "nova-multimodal-verify"
REGION = os.getenv("AWS_REGION")

FILES_TO_UPLOAD = {
    "packing_slip.png": "verifications/packing_slip.png",
    "box_contents.png": "verifications/box_contents.png"
}

s3 = boto3.client('s3', region_name=REGION)

def setup_verification_storage():
    try: 
        # ON us-east-1, you don't need a CreateBucketConfiguration 
        if REGION == 'us-east-1':
            s3.create_bucket(Bucket=BUCKET_NAME)
        else:
            s3.create_bucket(
                Bucket=BUCKET_NAME,
                CreateBucketConfiguration={"LocationConstraint": REGION}
            )
            print(f"✅ Bucket '{BUCKET_NAME}' created successfully.")
    except Exception as e:
        print(f"❌ Error: {e}")

# 2. Upload the Evidence Photos
    for local_file, s3_key in FILES_TO_UPLOAD.items():
        if os.path.exists(local_file):
            try:
                print(f"📤 Uploading {local_file} to s3://{BUCKET_NAME}/{s3_key}...")
                s3.upload_file(local_file, BUCKET_NAME, s3_key)
                print(f"✅ Uploaded {local_file}.")
            except Exception as e:
                print(f"❌ Failed to upload {local_file}: {e}")
        else:
            print(f"⚠️  File not found: {local_file}. Please check your filenames!")

if __name__ == "__main__":
    setup_verification_storage()

