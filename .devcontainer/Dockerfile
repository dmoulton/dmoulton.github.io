FROM ruby:3.2.3

ARG USERNAME=astro
ARG USER_UID=1000
ARG USER_GID=$USER_UID

# Install dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    nodejs \
    npm \
    git \
    sudo \
    curl \
    zsh \
    less \
    vim \
    python3 \
    imagemagick \
    python3-pip \
    python3-imagesize \
    python3-yaml \
    && groupadd --gid $USER_GID $USERNAME \
    && useradd --uid $USER_UID --gid $USER_GID -m -s /bin/zsh $USERNAME \
    && echo "$USERNAME ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Make sure /bin/zsh is a valid shell
RUN echo "/usr/bin/zsh" >> /etc/shells

# Setup Oh My Zsh and default environment
USER $USERNAME
WORKDIR /workspace

RUN sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended \
    && sed -i 's/^ZSH_THEME=.*/ZSH_THEME="bira"/' ~/.zshrc

ENV GEM_HOME=/home/$USERNAME/.gem
ENV PATH=$GEM_HOME/bin:$PATH

RUN gem install bundler -v 2.6.9 && \
    gem install --no-document bundler jekyll && \
    echo "alias js='bundle exec jekyll serve --host 0.0.0.0'" >> ~/.zshrc

EXPOSE 4000
# Let VS Code handle startup; don't specify CMD or ENTRYPOINT
CMD ["sleep", "infinity"]
