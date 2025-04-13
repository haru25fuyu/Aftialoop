FROM almalinux:latest

# 必要なパッケージのインストール（PHP, Apache, MariaDB client など）
RUN dnf -y update && \
    dnf install -y \
    httpd \
	mod_ssl \
    php \
    php-mysqlnd \
    php-fpm \
    php-gd \
    php-xml \
    php-mbstring \
    php-json \
    php-opcache \
    php-curl \
    php-intl \
    php-zip \
    mariadb && \
    dnf clean all

# WordPress用にApacheを調整（mod_rewrite 有効など）
RUN echo "ServerName localhost" >> /etc/httpd/conf/httpd.conf && \
    sed -i '/^LoadModule rewrite_module/s/^#//' /etc/httpd/conf/httpd.conf

# ドキュメントルートを /var/www/html に設定（変更したい場合はここ）
WORKDIR /var/www/html

# ポート公開
EXPOSE 80 443

# 起動コマンド
CMD ["/usr/sbin/httpd", "-DFOREGROUND"]
