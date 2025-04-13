FROM almalinux:latest

# Node.js / Go / Apache + 必要なものをインストール
RUN dnf -y update && \
    dnf module enable -y nodejs:18 && \
    dnf install -y \
    httpd \
    mod_ssl \
    openssh-server \
    git \
    golang \
    nodejs \
    sudo \
    which && \
    dnf clean all

# SSH 初期設定（任意）
RUN ssh-keygen -A

# npmバージョン確認（インストールされているか確認）
RUN npm -v

# Apache 警告防止
RUN echo "ServerName localhost" >> /etc/httpd/conf/httpd.conf

# ポート開放
EXPOSE 22 80 443

# Apache 起動
CMD ["/usr/sbin/httpd", "-DFOREGROUND"]
