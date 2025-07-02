FROM ruby:3.2.3

ARG USERNAME=astro
ARG USER_UID=1000
ARG USER_GID=$USER_UID

# Install dependencies and Zsh
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
  && mkdir -p /home/$USERNAME/workspace \
  && chown -R $USERNAME:$USERNAME /home/$USERNAME \
  && apt-get clean

USER $USERNAME
WORKDIR /home/$USERNAME

# Install Oh My Zsh (no chsh needed since shell is already /bin/zsh)
RUN sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended \
  && sed -i 's/^ZSH_THEME=.*/ZSH_THEME="bira"/' ~/.zshrc

# Use user's own gem path
ENV GEM_HOME=/home/$USERNAME/.gem
ENV PATH=$GEM_HOME/bin:$PATH

WORKDIR /home/$USERNAME/workspace

RUN gem install bundler -v 2.6.9
RUN gem install --no-document bundler jekyll
