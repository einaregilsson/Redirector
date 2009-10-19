import os, os.path, zipfile

os.chdir(r'components\interfaces')
for f in os.listdir('.'):
	if f.startswith('rdI') and f.endswith('.idl'):
		os.system(r'xpidl -m typelib -e ..\%s %s' % (f[:-3] + 'xpt',f))
os.chdir(r'..\..')

xpi = zipfile.ZipFile('redirector-2.0.xpi','w')
for (root, folders, files) in os.walk('.'):
	if not '.svn' in root:
		for f in files:
			if f.lower().endswith(('.rdf', '.manifest', '.js', '.xpt', '.png', '.css', '.dtd', '.properties', '.xul', '.html')):
				xpi.write(os.path.join(root[2:],f))

xpi.close()


