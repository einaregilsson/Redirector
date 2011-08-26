import os, os.path, zipfile

xpi = zipfile.ZipFile('redirector-2.6.xpi','w')
for (root, folders, files) in os.walk('.'):
	if not '.svn' in root:
		for f in files:
			if f.lower().endswith(('.rdf', '.manifest', '.js', '.xpt', '.png', '.css', '.dtd', '.properties', '.xul', '.html')):
				xpi.write(os.path.join(root[2:],f))

xpi.close()


