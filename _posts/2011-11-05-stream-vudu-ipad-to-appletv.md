---
layout: post
comments: true
title: Streaming vudu.com videos from your iPad to AppleTV via AirPlay
categories: apple ios ipad appletv
published: false
---
If you have tried to stream your vudu.com video playing onto your AppleTV, you may have found that all you seem to get is the audio. It is possible, with a little setup and some small inconvenience, to get the audio to stream as well.

###Onetime setup steps###

1. Navigate to this page on your iPad.

2. Highlight and copy this text: {% highlight sh %}javascript:d=document,e=d.createElement('script');e.src='http://bendodson.com/bookmarklets/ios-airplay.js?'+(new%20Date()*1);void(d.body.appendChild(e));{% endhighlight %}
3. Create a bookmark in Safari.

4. Edit the bookmark, and paste in the code you copied.

5. Change the name of the bookmark to whatever makes sense to you.

---

###Bookmarklet Usage###

1. Visit vudu.com on your iPad. Find a movie you want to watch.

2. Start the movie.

3. Stream it to your AppleTV. You will only get audio.

4. Choose the bookmarklet from the bookmarks menu. This will probably show an error on the screen.

5. Start the movie again. It should stream just fine now.

If anyone knows a slicker way to do this, please let me know, but for now this works ok. This also works on other video sites that only stream the audio by default. I would recommend trying this out on Vudu previews.
