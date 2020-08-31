---
title: Ubuntu 9.04 Install Experience
layout: post
categories: linux
archived: true
---
The laptop I currently use at work and home has in the past been a dual boot, XP and Ubuntu machine. I kept Windows on it mostly because we're really a windows shop at work, so I felt like I needed to have that available to me. It seems like I boot into windows maybe once every six weeks, and thats for maybe 5 minutes to check whether something works in IE. Thats about all I can stand...

So, I decided that a VM would be more than enough to cover that need, which would free up quite a bit of disk space and remove the dual boot.

I also wanted to move to having /home on its own partition, something I've been too lazy to do in the past. Thats pretty lazy, I know.

So, having a partition with XP that I no longer wanted gave me the perfect opportunity to install Ubuntu Jaunty and make sure it was OK. This being my work computer, being out of commission for a few days is not possible. So, I can install it on the XP partition, use it for a few days, copy over everything I need and then turn the partition with Ubuntu 8.10 on it into my new /home partition.

I downloaded the Jaunty beta iso last evening. Using the torrent, it came down in less than 20 minutes. Awesome. Burned it to CD and popped it into the laptop CD drive. It booted up pretty fast for a live CD, it seemed to me. I passed through a nice new GDM login page, and then came the familiar Ubuntu login sound.

Then I noticed something strange. The window list at the bottom of the screen was filling up with "Starting File Manager". It was full, and just kept getting more. Doing a search, I found a bug discussed which results in Nautilus dying and respawning over and over again.
{% highlight text %}
https://bugs.launchpad.net/ubuntu/+source/nautilus/+bug/325973
{% endhighlight %}


I restarted XWindows several times, to no avail. At that point I was considering letting it go for another beta version, to see if it would clear up. I was concerned that it was the Live CD that was doing this, and that perhaps a real install would not. So, I figured I would install it in a Virtual Box VM, to see how it did.

The VM install worked fine. No respawning problems whatsoever. So I rebooted the Live CD, and this time there was no respawning. Weird.

So, off to the install. Its been awhile since I've done a fresh install of Ubuntu, so I hadn't used the disk partitioner in quite a while. I found it pretty easy. I just chose the ntfs partition and chose to format it as ext4 and mount it on / . The install itself took very little time, 10 or 15 minutes.

By this time it was getting pretty late in the evening, and bed was calling. I decided to update everything and go to sleep while that was happening. It was off to the races doing that, and I checked out.

This morning when I got up and checked, it was hung up while updating. It had gotten everything downloaded, but hung up while installing the updates. I had to hard reboot it. After the boot, XWindows wouldn't start. I decided to reboot into the Live CD and see if I could fix it. Did that, and chrooted myself into the jaunty partition. I tried the usual things when trying to resurrect a pooched apt db.

{% highlight sh %}
apt-get -r install
{% endhighlight %}

and then
{% highlight sh %}
apt-get update
{% endhighlight %}

These two did manage to get past most of the problems. I had to force a re-install of libtango and a couple others.

But, in the end, the weirdness didn't go away. I had to start over. Ick.

Luckily, the second time around has worked much better. No hanging, no respawning of Nautilus.

I'm not going to give a run down of new features, as you can get that elsewhere. I modified the default color-scheme and wallpaper. Here's what I have so far:


Now that I've gotten past the install issues, everything seems great so far. Fast to boot, and faster in general.

More later...
