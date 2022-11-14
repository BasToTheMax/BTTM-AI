print("Hello, World")

import secrets
import gradio as gr
import torch
from torch import autocast
from diffusers import StableDiffusionPipeline
from PIL import Image

print("Deps loaded!")

model_id = "CompVis/stable-diffusion-v1-4"
device = "cpu"

pipe = StableDiffusionPipeline.from_pretrained(model_id, use_auth_token=True)
pipe = pipe.to(device)

print("Loaded!")

def predict(name):
    print(f"Prompt: {name}")
    prompt = name
    with autocast("cuda"):
        image = pipe(prompt, guidance_scale=7.5, width=512, height=512, num_inference_steps=20).images[0]

    # id = secrets.token_urlsafe(16)
    # image.save(f"./out/{id}.png")

    return image

print("Starting...")
demo = gr.Interface(
    predict,
    inputs=[
        gr.inputs.Textbox(label='Prompt', default='a chalk pastel drawing of a llama wearing a wizard hat')
    ],
    outputs=gr.Image(shape=[512,512], type="pil", elem_id="output_image"),
    css="#output_image{width: 512px; height: 512px}",
    title="Retslav -  Text To Image - Stable Diffusion",
    description="Retslav Stable Diffussion"
)

demo.launch(server_port=3000, share=True)
