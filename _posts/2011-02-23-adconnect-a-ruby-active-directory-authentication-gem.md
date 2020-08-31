---
title: ADConnect - A Ruby Active Directory Authentication Gem
layout: post
comments: true
categories: programming ruby
archived: true
---
Over the past few weeks its become more and more apparent to me that I would need to be able to authenticate some of our internal rails sites to the Active Directory. There are a number of plugins and gems to get the job done, although almost all of them are geared towards vanilla ldap. Of course, Active Directory isn't **quite** the same as ldap. That shouldn't come as any surprise.

So, I ended up rolling my own. Not sure who else it will be useful to, but who knows?

## Usage ##
{% highlight sh %}
gem install adconnect
{% endhighlight %}    
This will also install net-ldap.

{% highlight ruby %}
require 'adconnect'

Adconnect::ActiveDirectoryUser.server = "localhost"
Adconnect::ActiveDirectoryUser.port = "389"
Adconnect::ActiveDirectoryUser.base = "DC=example,DC=com"
Adconnect::ActiveDirectoryUser.domain = "example.com"

user = Adconnect::ActiveDirectoryUser.authenticate('myusername','mypassword')

user.cn #=> ["firstname lastname"]

{% endhighlight %}

An inspection of the user object will reveal the other fields that you can extract.

The defaults for setup are:
{% highlight text %}
server: localhost
port: 389
base: 'DC=example,DC=com'
domain: example.com
{% endhighlight %}
You should rarely have to override the port setting, so you'll be able to leave that out during setup.

This is an initial release, and doesn't have much in the way of error handling or tests. That will come down the road.
