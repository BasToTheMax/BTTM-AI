apt-get update -y
apt install git python3 python3-pip nginx -y

mkdir /root/AI
cd /root/AI
git clone https://github.com/BasToTheMax/BTTM-AI .

rm /etc/nginx/sites-enabled/default
cp nginx-site.conf /etc/nginx/sites-enabled/default

service nginx restart

pip3 install Pillow diffusers accelerate transformers gradio
pip3 install torch torchvision torchaudio --extra-index-url https://download.pytorch.org/whl/cpu

git config --global credential.helper store

cp bttm.service /etc/systemd/system/bttm.service
systemctl enable bttm --now
service bttm stop

rm main.py
cp main-cpu.py main.py

huggingface-cli login
