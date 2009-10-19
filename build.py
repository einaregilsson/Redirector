import os, os.path, zipfile

xpi = zipfile.ZipFile('redirector-2.0.xpi','w')
for (root, folders, files) in os.walk('.'):
	if not '.svn' in root:
		for f in files:
			if not f.endswith(('.xpi', '.bat', '.py')):
				xpi.write(os.path.join(root[2:],f))

xpi.close()


