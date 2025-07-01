echo '{
  "dns": ["8.8.8.8", "1.1.1.1"],
  "registry-mirrors": ["https://mirror.gcr.io"],
  "ipv6": false
}' | sudo tee /etc/docker/daemon.json

# Khởi động lại Docker service
sudo systemctl restart docker
