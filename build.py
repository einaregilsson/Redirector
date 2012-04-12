import os, os.path, zipfile

xpi = zipfile.ZipFile('ayubowan-redirector.xpi','w')
for (root, folders, files) in os.walk('.'):
	if 'unittest' in root:
		continue
	if not '.svn' in root:
		for f in files:
			if f.lower().endswith(('.rdf', '.manifest', '.js', '.xpt', '.png', '.css', '.dtd', '.properties', '.xul', '.html')):
				xpi.write(os.path.join(root[2:],f))

xpi.close()


