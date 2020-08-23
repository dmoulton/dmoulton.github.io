---
title: Installing RMagick on Ubuntu Maverick
layout: post
comments: true
categories: linux
published: false
---
Installing RMagick can be an adventure to say the least. It seems to me like sometimes it goes great, then the next time you're all afternoon.


Here are steps I had to go through for installing it on Ubuntu 10.10 that hopefully will help somebody down the road. That somebody may be me, you never know.
{% highlight sh %}
sudo apt-get install imagemagick graphicsmagick
sudo apt-get install libgraphicsmagick
sudo apt-get install libmagickcore-dev libmagickwand-dev

gem install rmagick
{% endhighlight %}
