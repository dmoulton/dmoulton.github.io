---
title: Debugging CakePHP in Eclipse
layout: post
published: false
categories: programming PHP
---

I've been getting my hands dirty with some CakePHP programming lately. I'm still doing my share of Rails, but have a cake project going as well.

One of the things that is a must have for me is an integrated debugger in my IDE. I feel a bit like I have a hand tied behind me without it.

So getting going with cakePHP means spending some time getting debugging to work in Eclipse. It seems to be working well enough at this point, so here are the steps that got me where I am now.


1. I personally would recommend downloading the all-in-one PDT download from the zend site.

	[http://www.zend.com/en/community/pdt](http://www.zend.com/en/community/pdt)

2. Also, from the same page above, download the webserver debugger. Its the last link on that page, at least right now. Download the correct version for your platform.

3. Install eclipse

4. Follow the README instructions found in the debugger archive. This will involve editing your php.ini file.

5. Restart your Apache server

6. In Eclipse, click on the debug button ![Debug Button](/assets/debugbutton.png) and choose "Open Debug Dialog...". You should see something like this:

	![Step 6 Screenshot](/assets/step_6.png)

7. Right Click on PHP Web Page on the left and Choose new.

8. Server/Debugger should be Zend

9. You shouldn't need to change the PHP Server, unless you are developing on a vhost that is on a port other than 80, like I am. If you are, click on Configure... and add a port in that dialog.

10. Browse the File input to the /app/webroot/index.php of your project.

11. Deselect Auto Generate, and put /index.php in the right hand entry.

12. Save your progress.

At this point, you should be able to click debug and you'll stop at any breakpoints you have set. I also prefer to deselect "Break at first line", but thats your choice.
