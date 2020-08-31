---
title: Testing a Simple Rails XML API
layout: post
categories: programming ruby rails
archived: true
---
I have a very simple xml API for adding users to our system at work. It adds a user to our front end database, and also adds that same user to our back end billing system. It needs a refactor quite badly, so testing needs to be created to make sure that the refactor works as it should.

The xml that it accepts looks like this:

{% highlight xml %}
<auth_request>
<vendor_id>1</vendor_id>
<vendor_password>password</vendor_password>
<lead_source_id>217</lead_source_id>
<products>
<id>A-123</id>
</products>
<firstname>Ted</firstname>
<lastname>Tester</lastname>
<address1>123 East 123 South</address1>
<address2>Apartment 6</address2>
<city>mytown</city>
<state>ST</state>
<zip>84033</zip>
<remote_host>remotesite.com</remote_host>
<email>tedtester@isp.com</email>
<billing>
<name></name>
<address></address>
<zip></zip>
<cc_num></cc_num>
<exp></exp>
</billing>
</auth_request>
{%endhighlight%}

It gets submitted to the api controller of my rails app, using the index action. Here is what it returned when it's successful:

{% highlight xml %}
<auth_response>
<error>0</error>
<registration_code>XBZ-T-123:61111-1329</registration_code>
<debug>
</debug>
</auth_response>
{% endhighlight %}

Because I generated the api_controller, it provided me with a proper functional test. This is where we'll test the api.

To start, lets put together a simple static test:

api_controller_test.rb:

{% highlight ruby %}
include REXML

def test_index
myxml = "<auth_request>
<vendor_id>vendoruser1</vendor_id>
<vendor_password>myebiz</vendor_password>
<lead_source_id>217</lead_source_id>
<products>
<id>A-123</id>
</products>
<firstname>Ted</firstname>
<lastname>Tester</lastname>
<address1>123 East 123 South</address1>
<address2>Apartment 6</address2>
<city>mytown</city>
<state>ST</state>
<zip>84033</zip>
<remote_host>ProcessAuctions.com</remote_host>
<email>tedtester@myebiz.com</email>
<billing>
<name></name>
<address></address>
<zip></zip>
<cc_num></cc_num>
<exp></exp>
</billing>
</auth_request>"

post :index, :user=>myxml
assert_response :success
xml_response = Document.new( @response.body)

puts xml_response.elements["auth_response/registration_code"].text
end
{% endhighlight %}

Obviously, not the complete file, just the bits I created. The generator script started me off with much more.

If I test this script:

{% highlight sh %}
ruby api_controller_test.rb
{% endhighlight %}

I get

{% highlight text %}
dmoulton@xerxes:~/dev/auth/test/functional$ ruby api_controller_test.rb
Loaded suite api_controller_test
Started
EBX-T-123:45555-1425
.
Finished in 1.120767 seconds.

1 tests, 1 assertions, 0 failures, 0 errors
{% endhighlight %}

Obviously, the puts statement is not that useful. Let's replace it with a test:

{% highlight ruby %}
assert_not_equal(0, xml_response.elements["auth_response/registration_code"].text.length,

					"A proper activation code was not returned" )
{% endhighlight %}


This will tell us if the api doesn't return a valid activation code.

Next we need to get rid of that static xml and build it on the fly from some fixtures. I'd like to be able to test a large number of scenarios that might happen, including failures and malicious usage.

Here's what my yaml file looks like:

{% highlight yaml %}
1:
vendor_id: vendoruser1
vendor_password: vpw
lead_source_id: 217
products: 123,67
firstname: Ted
lastname: Tester
address1: 123 East 456 South
address2: Apt 2
city: slc
state: UT
zip: 84043
remote_host: myhost
email: tedtester@company.com
billing_name: ted tester
billing_address: 123 East 456 South Lehi UT
billing_zip: 84043
cc_num: 4111111111111111
cc_exp: 10/2010

2:
vendor_id: vendoruser2
vendor_password: mpw
lead_source_id: 219
products: 123
firstname: Teddy
lastname: Tester2
address1: 123 East 456 South
address2: Apt 5
city: Lehi
state: UT
zip: 84043
remote_host: myhost
email: tedtester@company.com
billing_name: ted tester2
billing_address: 123 East 456 South Lehi UT
billing_zip: 84043
cc_num: 4111111111111111
cc_exp: 10/2010
{% endhighlight %}

To read this in, I'll create a method in test_helper.rb:

{% highlight ruby %}
def make_api_xml_request(info)
	userxml = REXML::Document.new
	products = info['products'].split(",")
	userxml = REXML::Document.new
	root = REXML::Element.new('auth_request')
	userxml.add_element(root)
	root.add_element('vendor_id').add_text(info['vendor_id'])
	root.add_element('vendor_password').add_text(info['vendor_password'])
	root.add_element('lead_source_id').add_text(info['lead_source_id'].to_s)

	prod = REXML::Element.new('products')

	products.each do |p|
		prod.add_element('id').add_text(p)
	end

	root.add_element(prod)
	root.add_element('firstname').add_text(info['firstname'])
	root.add_element('lastname').add_text(info['lastname'])
	root.add_element('address1').add_text(info['address1'])
	root.add_element('address2').add_text(info['address2'])
	root.add_element('city').add_text(info['city'])
	root.add_element('state').add_text(info['state'])
	root.add_element('zip').add_text(info['zip'].to_s)
	root.add_element('remote_host').add_text(info['remote_host'])
	root.add_element('email').add_text(info['email'])
	billing = REXML::Element.new('billing')
	billing.add_element('name').add_text(info['billing_name'])
	billing.add_element('address').add_text(info['billing_address'])
	billing.add_element('zip').add_text(info['billing_zip'].to_s)
	billing.add_element('cc_num').add_text(info['cc_num'].to_s)
	billing.add_element('exp').add_text(info['cc_exp'])

	root.add_element(billing)
	userxml
end
{% endhighlight %}


Then, back in api_controller_test.rb, we can call the helper app for each user we find in the yaml file. Make sure that you are requiring the yaml library.

{% highlight ruby %}
require 'yaml'
{% endhighlight %}

Here's the loop to read in users from the yaml and test them:

{% highlight ruby %}
user = load_from_yaml(RAILS_ROOT + '/test/fixtures/xml_api_users_should_pass.yml')
user.each do |tmp,info|
	userxml = make_api_xml_request(info)
	post :index, :user=>userxml.to_s
	assert_response :success
	xml_response = Document.new( @response.body)
	assert_equal('0',xml_response.elements["auth_response/error"].text)
	assert_not_equal(0, xml_response.elements["auth_response/registration_code"].text.length, "A proper activation code was not returned" )
end
{% endhighlight %}

Now our output is:

{% highlight text %}
dmoulton@xerxes:~/dev/auth/test/functional$ ruby api_controller_test.rb
Loaded suite api_controller_test
Started
..
Finished in 611.141555 seconds.

2 tests, 12 assertions, 0 failures, 0 errors
{% endhighlight %}

We can then create multiple yaml files, each containing users that will test the api in one way or another. One might make sure that vendors with invalid usernames or passwords can't log in. Another might try to use sql injection to trash the database. Use your imagination.
