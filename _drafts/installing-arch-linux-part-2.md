---
Title: Installing Arch Linux [Part 2]
layout: post
categories: linux
comments: true
author: David Moulton
---
This post is the second part describing my personal install of Arch Linux. Part 1 ended with a very basic command line install of Arch, including luks encryption, btrfs filesystem, and a swapfile.

This post will describe installation of the Budgie window manager and Plank.

As in the first part, I recommend that you try this in a VM a few times to see if it gets you what you are looking for.

## Create a user
    # useradd -mG wheel <username>

## Enable sudo
    # EDITOR=vi visudo    

Uncomment the line `%wheel ALL=(ALL) ALL`

## Set a passwd
    # passwd <usrname>

Log out and then log in as the new user

## Install Budgie, Gnome, and a few more basic needs
    # sudo pacman -S xf86-video-intel xorg lightdm budgie-desktop gnome gnome-control-center gnome-tweaks chromium git tilix plank pulseaudio pulseaudio-alsa alsa 

If you don't have intel video, adjust accordingly. Gor a VM, use xf86-video-xorg.

## Install slick greeter
I prefer slick greeter to gtk greeter, so I will use that. It requires AUR.

    # mkdir ~/installers
    # cd installers
    # git clone https://aur.archlinux.org/lightdm-slick-greeter.git
    # cd lightdm-slick-greeter
    # makepkg -si

## Edit the lightdm conf
In the seats section. Uncomment `greeter-session` and set it to `lightdm-slick-greeter`

## Enable the lightdm service
    # systemctl enable lightdm



