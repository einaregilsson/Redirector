#!/usr/bin/python

import os, os.path, re, zipfile, json

def get_files_to_zip():
	#Exclude git stuff, build scripts etc.
	exclude = [
		r'\.(py|sh|pem)$', #file endings
		r'(\\|/)\.', #hidden files
		r'package\.json|icon\.html', #file names
		r'(\\|/)(promo|unittest|build)(\\|/)' #folders
	]

	zippable_files = []
	for root, folders, files in os.walk('.'):
		print root
		for f in files:
			file = os.path.join(root,f)
			if not any(re.search(p, file) for p in exclude):
				zippable_files.append(file)
	return zippable_files

def create_firefox_addon():
	print ''
	print '**** Creating addon for Firefox ****'
	os.system('jpm xpi')
	import glob, shutil
	name = glob.glob('*.xpi')[0]
	new_name = os.path.join('build', 'redirector-firefox.xpi')
	#Manually update the install.rdf to get the preferences button working...

	#jpm created the install.rdf during build, but doesn't allow adding a options url
	#so we patch it here
	with zipfile.ZipFile(name, 'r') as zin:
		with zipfile.ZipFile(new_name, 'w') as zout:
			zout.comment = zin.comment 
			for item in zin.infolist():
				bytes = zin.read(item.filename)
				if item.filename == 'install.rdf':
					bytes = bytes.replace('</em:creator>', '</em:creator>\n          <em:optionsURL>resource://redirector-at-einaregilsson-dot-com/redirector.html</em:optionsURL>\n          <em:optionsType>2</em:optionsType>\n')
				
				zout.writestr(item, bytes)

	os.remove(name)


def create_addon(files, browser):
	output_folder = 'build'
	if not os.path.isdir(output_folder):
		os.mkdir(output_folder)

	output_file = os.path.join(output_folder, 'redirector-%s.zip' % browser)
	zf = zipfile.ZipFile(output_file, 'w', zipfile.ZIP_STORED)
	cert = 'extension-certificate.pem'

	print ''
	print '**** Creating addon for %s ****' % browser
	
	if browser == 'opera' and not os.path.exists(cert):
		print 'Extension certificate does not exist, cannot create .nex file for Opera'
		return

	for f in files:
		print 'Adding', f
		if f.endswith('manifest.json'):
			manifest = json.load(open(f))
			if browser != 'firefox':
				del manifest['applications'] #Firefox specific, and causes warnings in other browsers...

			if browser == 'opera':
				manifest['options_ui']['page'] = 'redirector.html' #Opera opens options in new tab, where the popup would look really ugly
				manifest['options_ui']['chrome_style'] = False

			zf.writestr(f[2:], json.dumps(manifest, indent=2)) 
		else:
			zf.write(f[2:])

	zf.close()

	if browser == 'opera':
		#Create .nex
		os.system('./nex-build.sh %s %s %s' % (output_file, output_file.replace('.zip', '.nex'), cert))



if __name__ == '__main__':
	#Make sure we can run this from anywhere
	folder = os.path.dirname(os.path.realpath(__file__))
	os.chdir(folder)

	files = get_files_to_zip()
	
	print '******* REDIRECTOR BUILD SCRIPT *******'
	print ''

	browsers = ['chrome', 'firefox', 'opera']
	create_addon(files, 'chrome')
	create_addon(files, 'opera')
	create_firefox_addon()

