---
Title: Installing Arch Linux [Part 1]
layout: post
categories: linux
comments: false
author: David Moulton
archived: true
---

This article describes my installation procedure for a very basic starting point with Arch Linux. My philosophy on the initial install is to only install what is absolutely needed, especially before the first boot. That's when you find out if you screwed up, after all.

Part 2 will describe more setup, including installation of my preferred desktop environment, Budgie.

This installation procedure will result in an Arch Linux install with the following features:

+ Systemd Boot
+ BTRFS as the file system
	+ Subvolumes: root, home, pkg, and swap
+ An encrypted drive
+ A swap file

## Why Arch Linux?
After many (many) years on Ubuntu and other forms of Debian, I needed a change. I wanted to have more control over my install. There is so much bloat on most distributions, and you end up with largely what someone else decided you should have. I'm a long time Linux user, so I'm comfortable hacking around in configs and troubleshooting issues. That said, another result of using a pre-prepared distrubution is that you don't necessarily understand what's happening under the covers. I don't need Linux From Scratch, but I don't want Ubuntu any more. It's a great distribution, but it's time for me to move on. I chose Arch to take me further towards a better understanding of my system. Does this describe you? If so, follow along.

## Practice makes perfect
Of course if you want choice, you have to make decisions. I suggest you take your time while you are preparing to install Arch, before you commit it to your drives. This is especially true if you are replacing your running drive like I did. I couldn't afford lots of downtime while I figured things out. I made extensive use of Virtual Box VMs to learn the ropes of install and make choices of how I wanted to configure my system. I've create and destroyed at least 20 VMs while learning the best Arch install for me. I suggest you do the same. You might find that the components I've chosen for my install don't match what you need or want. Better to find that out in a VM rather than your real drive.

# Configuring Virtualbox
If you choose to use Virtualbox, here are a few things I would suggest you use to configure your VM.

1. Memory Size - I'd recommend 2048 MB. You could probably get along with 1GB if you aren't going on to install a GUI.

2. Hard Disk - Make your hard drive at least 25 GB. I usually use 30. Be sure to use a dynamic size. No need to take up all the space at first.

3. After the install, click the `Settings` button at the top.

4. On the `System` tab, check the `Enable EFI` checkbox.

5. On the `Display` tab, increase Video Memory to 128MB and check `Enable 3D Acceleration`

6. On the `Network` tab, click `Advanced` and then `Port Forwarding`. 

	7. Click the + symbol a the right of the window to add a port forwarding rule allowing SSH into the VM. You'll be glad you did.

	8. Use these settings
		- Name: SSH
		- Host IP: 127.0.0.1
		- Host Port: 2222
		- Guest IP 10.0.2.15
		- Guest Port: 22
	9. Click OK.

9. On the User Interface tab: Personal choice, but I like to click the "Show at top of screen" checkbox to put the dropdown at the top rather than the bottom.

## Starting the Installation

Whether it's a VM or your computer, boot into the Arch install ISO.

# Enable SSH 

It is much more convenient when installing Arch to ssh into the box from another computer. This allows copy and paste and better fonts, etc.

On the new machine, after booting into the Arch ISO 

	# systemctl enable sshd.service --now

Set a password for root:

	# passwd

Look up the IP address of the PC:

	# ip a

You can now use that IP address to SSH in and continue.

# Optional - If using Virtual Box
If you are doing this on a VM using Virtual Box, I highly recommend you ssh into your virtual machine. Doing so from a terminal on your main computer is much more convenient way to enter commands, allowing cut at paste. Be sure to follow the VM setup above if you are using it. If you aren't, skip to **Partitioning**. You need to have followed the instructions above for configuring your VM. You will use this command:

	# ssh -p 2222 root@127.0.0.1
	
# Set up good Arch mirrors
Make sure that you are going to get as good a download as you can using reflector

	# pacman -Syyy
	# pacman -S reflector
	# reflector --verbose --country US --latest 5 --sort rate --save /etc/pacman.d/mirrorlist
	# pacman -Syyy
	
# Sync with ntp servers
	# timedatectl set-ntp true
	

## Partitioning
I assume here that you are installing Arch Linux on /dev/sda. If you aren't, you'll need to replace your all references to it with your drive. I prefer using cfdisk for partitioning.

	# cfdisk /dev/sda

Choose the `gpt` label type

# Create new partition table

1. With the Free Space selected, hit enter

2. Enter +550M for the partition size and hit enter

3. Hit the right arrow to choose `[Type]`. Arrow up to the top and choose EFI. Hit enter

4. Down arrow to choose Free Space, and then choose `[New]` and hit enter

5. Accept partition size at whatever it is. It's the rest of your drive. Hit `Enter`

6. Right arrow over to `[Write]` and hit `Enter`

7. Type "yes" and hit `Enter`

8. Arrow over to `[Quit]` and hit `Enter`

## Encryption
Next we'll create an encrypted container for the root file system. You will need to have a good pass phrase that will be used to unlock your drive whenever you boot up.

We'll use cryptsetup for these next few steps.

	# cryptsetup luksFormat /dev/sda2

Open the container. The term “luks” is just a placeholder, you can use whatever you want to, just remember to use that same term consistently.

	# cryptsetup open /dev/sda2 luks

## File System Creation
Format the EFI partition with FAT32 and give it the label EFI. The label is your choice.

	# mkfs.vfat -F32 -n EFI /dev/sda1

Format the root partition with Btrfs and give it the label ROOT. Again, choose whatever you want for this partition label. Remember to adust your name for the luks container if you changed it.

	# mkfs.btrfs -L ROOT /dev/mapper/luks

# Create and Mount Subvolumes
Create subvolumes for root, home, the package cache, snapshots, swap, and the entire Btrfs file system:

	mount /dev/mapper/luks /mnt
	btrfs sub create /mnt/@
	btrfs sub create /mnt/@home
	btrfs sub create /mnt/@pkg
	btrfs sub create /mnt/@snapshots
	btrfs sub create /mnt/@swap
	btrfs sub create /mnt/@btrfs
	umount /mnt

Mount the subvolumes

	mount -o noatime,nodiratime,compress=zstd,space_cache,ssd,subvol=@ /dev/mapper/luks /mnt
	mkdir -p /mnt/{boot,home,var/cache/pacman/pkg,.snapshots,btrfs,swap}
	mount -o noatime,nodiratime,compress=zstd,space_cache,ssd,subvol=@home /dev/mapper/luks /mnt/home
	mount -o noatime,nodiratime,compress=zstd,space_cache,ssd,subvol=@pkg /dev/mapper/luks /mnt/var/cache/pacman/pkg
	mount -o noatime,nodiratime,compress=zstd,space_cache,ssd,subvol=@snapshots /dev/mapper/luks /mnt/.snapshots
	mount -o noatime,nodiratime,space_cache,ssd,subvol=@swap /dev/mapper/luks /mnt/swap
	mount -o noatime,nodiratime,compress=zstd,space_cache,ssd,subvolid=5 /dev/mapper/luks /mnt/btrfs	

Mount the EFI partition

	# mount /dev/sda1 /mnt/boot
	
## Base System and /etc/fstab

# Install Arch Linux

There may be other packages that you need here. If you don't want to use vi, you can install nano or emacs instead. You may also want to install wifi tools if your machine isn't using ethernet.

	# pacstrap /mnt linux linux-firmware base base-devel btrfs-progs intel-ucode networkmanager network-manager-applet wireless_tools wpa_supplicant dialog os-prober mtools dosfstools openssh vi 
	
# Generate /etc/fstab

	# genfstab -U /mnt >> /mnt/etc/fstab
	
## System Configuration

chroot into the new system

	# arch-chroot /mnt
	
## Swap

I'm using a swap file here instead of a partition.

Start by creating zero byte file and giving it attributes that btrfs has to have when using a swap file. These commands disable Copy on Write and compression.

	# cd /swap
	# truncate -s 0 ./swapfile
	# chattr +C ./swapfile
	# btrfs property set ./swapfile compression none
	
Create the swap file. This creates a 2GB file. Change to suit your needs.

	# dd if=/dev/zero of=/swap/swapfile bs=1M count=2048 status=progress
	
Set secure file permissions

	# chmod 600 /swap/swapfile
	
Make it a swapfile

	# mkswap /swap/swapfile
	
Turn it on

	# swapon /swap/swapfile
	
Add it to the fstab

	# echo "/swap/swapfile                                  none            swap            defaults        0 0" >> /etc/fstab

	
Set host name

	# echo <YOUR HOST NAME> /etc/hostname

Set locale

	# echo LANG=en_US.UTF-8 > /etc/locale.conf
	
Uncomment the following rows of /etc/locale.gen:

	#en_US.UTF-8 UTF-8

## Generate locale

	# locale-gen

## Set time zone

Use the zoneinfo for your timezone

	# ln -sf /usr/share/zoneinfo/US/Mountain /etc/localtime

Define hosts in /etc/hosts:

	#<ip-address>	<hostname.domain.org>	<hostname>
	127.0.0.1	localhost <YOUR-HOSTNAME>.localdomain	<YOUR-HOSTNAME>
	::1		localhost.localdomain	localhost
	
Set root password

	# passwd
		
# Initramfs

Configure the creation of initramfs by editing `/etc/mkinitcpio.conf`. Change the line HOOKS=... to

	HOOKS="base keyboard udev autodetect modconf block keymap encrypt btrfs filesystems"
	
Recreate initramfs

	# mkinitcpio -p linux
	
## Boot Manager

# Install systemd-boot

	# bootctl --path=/boot install
	
Determine the UUID of your encrypted partition

	# blkid -s UUID -o value /dev/sda2
	
Create file `/boot/loader/entries/arch.conf` and fill it with this, replacing `<UUID-OF-ROOT-PARTITION>` with the UUID determined just above.

	title Arch Linux
	linux /vmlinuz-linux
	initrd /intel-ucode.img
	initrd /initramfs-linux.img
	options cryptdevice=UUID=<UUID-OF-ROOT-PARTITION>:luks:allow-discards root=/dev/mapper/luks rootflags=subvol=@ rd.luks.options=discard rw

Edit file `/boot/loader/loader.conf` and fill it with:

	default  arch.conf
	timeout  4
	console-mode max
	editor   no
	
## Networking

Make sure that networking starts up after you reboot

	# systemctl enable NetworkManager
		
# Final Steps
	
Exit chroot, unmount partitions and reboot

	# exit
	# umount -R /mnt
	# reboot

# Done, for now

Your machine or VM should reboot. It will ask you for the pass phrase you used when you encrypted the drive. You now have a very basic Arch linux install. Add whatever you need with Pacman or AUR. In Part 2, I'll guide you through installing Budgie and LightDM as a GUI.

# References
[Installing Arch Linux with Btrfs, systemd-boot and LUKS](https://www.nerdstuff.org/posts/2020/2020-004_arch_linux_luks_btrfs_systemd-boot/) | Nerdstuff

[Swap](https://wiki.archlinux.org/index.php/swap#Swap_file)	| Arch Wiki

