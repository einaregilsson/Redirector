#!/bin/sh
if [ -f Redirector.xpi ]; 
then  
		rm Redirector.xpi 
fi

zip Redirector.xpi * -r -x *unittest*  *.DS_Store -x .gitignore *.xpi *.sh
