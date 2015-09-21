#!/usr/bin/python

import os, os.path, re, zipfile, json

def get_files_to_zip():
	#Exclude git stuff, build scripts etc.
	exclude = [r'(\\|/)\.git(\\|/)', r'\.(py|sh)$', r'\.DS_Store$', r'\.gitignore$',r'(\\|/)build(\\|/)', '.*devprofile.*', r'debug\.sh']

	zippable_files = []
	for root, folders, files in os.walk('.'):
		for f in files:
			file = os.path.join(root,f)
			if not any(re.search(p, file) for p in exclude):
				zippable_files.append(file)
	return zippable_files

def create_addon(files, browser):
	output_folder = 'build'
	if not os.path.isdir(output_folder):
		os.mkdir(output_folder)

	extension = 'zip'
	if browser == 'firefox':
		extension = 'xpi'

	output_file = os.path.join(output_folder, 'redirector-%s.%s' % (browser, extension))
	zf = zipfile.ZipFile(output_file, 'w', zipfile.ZIP_STORED)
	
	print ''
	print '**** Creating addon for %s ****' % browser
	for f in files:
		print 'Adding', f
		if f.endswith('manifest.json'):
			manifest = json.load(open(f))
			if browser != 'firefox':
				del manifest['applications'] #Firefox specific, and causes warnings in other browsers...

			if browser == 'opera':
				manifest['options_ui']['page'] = 'data/redirector.html' #Opera opens options in new tab, where the popup would look really ugly
				manifest['options_ui']['chrome_style'] = False

			zf.writestr(f[2:], json.dumps(manifest, indent=2)) 
		else:
			zf.write(f[2:])

	zf.close()

if __name__ == '__main__':
	#Make sure we can run this from anywhere
	folder = os.path.dirname(os.path.realpath(__file__))
	os.chdir(folder)

	files = get_files_to_zip()
	
	print '******* REDIRECTOR BUILD SCRIPT *******'
	print ''

	browsers = ['chrome', 'firefox', 'opera']
	for b in browsers:
		create_addon(files, b)

