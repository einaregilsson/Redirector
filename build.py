import os, os.path, zipfile, sys

xpi = zipfile.ZipFile('redirector-' + raw_input('Version: ') + '.xpi','w')
for (root, folders, files) in os.walk('.'):
	if 'unittest' in root:
		continue
	if not '.svn' in root:
		for f in files:
			if f.lower().endswith(('.rdf', '.manifest', '.js', '.xpt', '.png', '.css', '.dtd', '.properties', '.xul', '.html')):
				xpi.write(os.path.join(root[2:],f))

xpi.close()


