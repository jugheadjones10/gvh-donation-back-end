import os, shutil

def selectiveCopy(folder):


	newFolder = os.path.abspath(folder)	
	os.makedirs(f'{newFolder}Copy')
	copyFolder = os.path.abspath(folder + "Copy")	

	# walk through the folder tree
	for foldername, subfolders, filenames in os.walk(newFolder):
		
		# search for .pdf file extension
		print(f'This is folder {foldername}')
		print(f'This folder has subfolders: {subfolders}')
		print(f'This folder contains the following files: {filenames}')

		# adds absolute path of each pdf file into allFiles list]
		for filename in filenames:				
			absFilename = os.path.join(foldername, filename)  
			if filename.endswith('.pdf'):
				shutil.copy(absFilename, copyFolder)

selectiveCopy("youngjin")