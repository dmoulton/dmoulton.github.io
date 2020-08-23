---
title: Re-sign Ruby Executable in OSX
layout: post
categories: programming ruby osx
comments: true
published: false
---
Yesterday I finally fixed an issue that I have been sort of ignoring for a few weeks. Each time I started a rails server in dev mode, I would get the alert box wanting to know if I want the application "ruby" to accept incoming network connections. No matter how many time I clicked allow, the next time I ran the server, it would ask me that again. I found that in firewall preferences, it was in the list to be allowed. It was annoying, but I didn't bother with finding a solution until yesterday. I made this fix in OSX Mountain Lion, but I assume it will work in other versions

I found that I needed to create a new software signing certificate, and then use that to sign the ruby I was using in my project. These are the steps I followed, taken from a post at: [forums.macnn.com](http://forums.macnn.com/79/developer-center/355720/how-re-sign-apples-applications-once)

First, determine if you have a bad cert

Locate the ruby you are using. If you are using rvm or some other manager, make sure the ruby you are using is active. Then,

  {% highlight bash %}$ which ruby{% endhighlight %}

When you have the path:

  {% highlight bash %}$ codesign -v /path/to/ruby{% endhighlight %}

If the above returns with nothing, then I don't think you have the same problem this post fixes, so you should not bother to go further. If you get some error text saying that you have a bad certificate or something to that effect, you might try what I describe below.

4. Create the new certificate

5. Open Keychain Access. Easiest way to do this is choose "Utilities" from the Go menu in a finder window. Start Keychain Access there.

6. Go to the Keychain Access menu, and under Certificate Assistant, choose Create a Certificate

7. Name your Certificate. (I recommend using something other than your first and last names)

8. For Type, choose Self Signed Root.

9. Make sure Let me override defaults is checked and click Continue.

11. Under Serial Number, use a random number. Just make sure there is no other certificate on your system with the same name and serial number

12. Give yourself a sufficiently long validity period. For a little over 5 years, use 2000 days. For almost 11 years, choose 4000 days.

13. Under Certificate Type, choose Code Signing, and click Continue.

14. Enter your personal information on the next screen. Have fun with Organization and Organizational Unit. After all, this is for your own personal use. Don't use "Apple." I myself used something like "Orange Computer" for Organization and "Hacking Department" for Organizational Unit. Click Continue when all has been filled out.

15. For Key Pair Information, accept the defaults and click Continue.

16. For Key Usage Extension, accept the defaults and click Continue.

17. For Extended Key Usage Extension, accept the defaults and click Continue.

18. For Basic Constraints Extension, accept the defaults and click Continue.

19. For Subject Alternate Name Extension, accept the defaults and click Continue.

20. Use your "login" keychain to store the certificate and click Continue.

21. Now you have to set your certificate to be "trusted."

22. Go to your keychain, and right click (control click) on the new certificate you made and choose Get Info.

23. Open the triangle next to Trust.

24. Go down to Code Signing, and choose Always Trust.

25. Close the box. The system will ask for your admin password. Enter it and click OK.

26. Now you will sign the executable

  {% highlight bash %}$ codesign -f -s <name from step 4> /path/to/ruby {% endhighlight %}

To make this work, I needed to go to System Preferences >> Security & Privacy >> Firewall >> Firewall Options. There I removed ruby from the list of applications. Also make sure that "Automatically allow" is checked. Close up preferences.

Once I completed these steps, I no longer receive the message I was receiving before.
