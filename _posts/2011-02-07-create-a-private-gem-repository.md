---
title: Create a Private Gem Repository
layout: post
comments: true
categories: programming ruby
published: false
---
I recently created a private gem repository for gems that I use at work that are not public. Searching for 'create gem repository' yields plenty of hits, but I had a couple of bumps along the journey that I thought I would detail here to help anyone else that might need it.

I use rvm pretty religiously, but I'm not going to involve it in these instructions. For those that need rvm, you'll know what to do.

#Here We Go#

The steps to building a repo are pretty simple, really.

1. Create a directory to host your gems.
	{% highlight sh %}mkdir -p /var/www/gem-repo/gems{% endhighlight %}
2. Copy your gems to /var/www/gem-repo/gems

3. Install the builder gem version 2.1.2. This was my first bump. Most instructions omit the version. It appears that builder 3.0 does not function properly in this situation. I received a variety of errors before I switched. Worked fine after that.
	{% highlight sh %}sudo gem install builder -v 2.1.2{% endhighlight %}

4. Generate the repo index
	{% highlight sh %}gem generate_index -d /var/www/html/gem-repo{% endhighlight %}

5. Create a virtual host on your web server that points to /var/www/html/gem-repo.
	{% highlight apache %}
<VirtualHost 192.168.1.1:80>
	ServerName mygemserver.com
	DocumentRoot /var/www/html/gem-repo
	<Directory>
	 Options Indexes FollowSymLinks
	  AllowOverride AuthConfig
	  Order allow,deny
	  Allow from all
	</Directory>
</VirtualHost>
	{% endhighlight %}
6. Add the source to your clients that need access to it. Don't do this yet if you want to add a password, described below.
	{% highlight sh %}gem sources -a http://mygemserver.com  {% endhighlight %}
7. Verify that it was added:
	{% highlight sh %}gem sources  {% endhighlight %}
8. When you have a new gem to add or update, simply perform steps 2 and 4 again.  

##Extra Credit##

This being a private gem repository, it seemed a good idea to me to password protect it. I'll use the .htaccess method, which I'm aware is not that secure. If somebody wants my gems bad enough, they'll get them. Congratulations.  

1. Add the proper allow to the server config. On apache, this is
	{% highlight apache %}AllowOverride AuthConfig {% endhighlight %}
2. Generate a .htpasswd file. I like to use http://www.4webhelp.net/us/password.php for that. Save the file wherever you feel is secure on your system.  

3. Create .htaccess in /var/www/html/gem-repo. It should look like this:
	{% highlight apache %}
AuthUserFile /location/of/.htpasswd
AuthType Basic
AuthName "Login Details"
Require valid-user  
{% endhighlight %}
4. After a restart of your web server, your gems are password protected. You'll need a different source.
	{% highlight sh %}
gem sources -a http://username:password@mygemserver.com
{% endhighlight %}
The alternative to setting up your own server is moving gem files around to where you need them, when you need them. Just say no.
