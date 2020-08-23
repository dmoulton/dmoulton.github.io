---
title: Ubuntu/Dropbox Issue Fixed
layout: post
comments: true
author: David Moulton
categories: linux
published: false
---
I've had an issue for several days now where my Ubuntu 10.10 based laptop would not sync to my Dropbox account. I felt as though I had one arm tied behind my back without a working dropbox. I reinstalled, relinked, and every other thing I could think of to redo.

Finally, I found this post in the dropbox forums: http://forums.dropbox.com/topic.php?id=32076&amp;replies=4#post-284751

The procedure:
{% highlight sh %}
dropbox stop
rm -r ~/.dropbox-dist
dropbox start -i
{% endhighlight %}
This will download and reinstall dropboxd on the machine. Once that happened, dropbox was once again happily syncing. Feels good to get that arm untied.
