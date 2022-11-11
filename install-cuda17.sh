apt-get update -y
apt install git python3 python3-pip nginx -y

mkdir /root/AI
cd /root/AI
git clone https://github.com/BasToTheMax/BTTM-AI .

rm /etc/ngix/sites-enabled/default
cp nginx-site.conf /etc/ngix/sites-enabled/default

servixe nginx restart

pip3 install Pillow diffusers accelerate transformers gradio
pip3 install torch torchvision torchaudio

huggingface-cli login
git config --global credential.helper store

cp bttm.service /etc/systemd/system/bttm.service
service bttm stop
