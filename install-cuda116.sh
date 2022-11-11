apt-get update -y
apt install git python3 python3-pip nginx -y

mkdir /root/AI
cd /root/AI
git clone https://github.com/BasToTheMax/BTTM-AI .

rm /etc/nginx/sites-enabled/default
cp nginx-site.conf /etc/nginx/sites-enabled/default

servixe nginx restart

pip3 install Pillow diffusers accelerate transformers gradio
pip3 install torch torchvision torchaudio --extra-index-url https://download.pytorch.org/whl/cu116

git config --global credential.helper store

cp bttm.service /etc/systemd/system/bttm.service
systemctl enable --now bttm
service bttm stop

huggingface-cli login
