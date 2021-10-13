import * as vscode from 'vscode';

function getFolder(path: string) {
	if (!path) { return path; }
	let pos = path.lastIndexOf("/");
	if (pos > -1) {
		return path.substring(0, pos + 1);
	}
	return path;
}

function joinPaths(parent: string, child: string) {
	let result = parent;
	if (!result) { result = "/"; }
	if (!result.endsWith("/")) { result += "/"; }
	if (child.startsWith("/")) { child = child.substr(1); }
	result += child;
	return result;
}

export function activate(context: vscode.ExtensionContext) {

	let disposable = vscode.commands.registerCommand('errcode.newErrCode', () => {
		if (!vscode.window.activeTextEditor) {
			vscode.window.showErrorMessage("You must have an active editor to generate an ErrCode");
			return;
		}
		let editor = vscode.window.activeTextEditor as vscode.TextEditor;
		let fileName = editor.document.fileName;
		let dotPosition = fileName.lastIndexOf(".");
		if (dotPosition === -1) {
			vscode.window.showErrorMessage("You must have an active editor with an extension to generate an ErrCode");
			return;
		}
		let extension = fileName.substring(dotPosition);

		let gitIgnoreFiles: vscode.Uri[];
		let doneIgnoreFiles = false;
		let allFoundFiles: vscode.Uri[];
		let doneFoundFiles = false;

		vscode.workspace.findFiles(".gitignore")
			.then(res => {
				gitIgnoreFiles = res;
				doneIgnoreFiles = true;
			});
		vscode.workspace.findFiles("**/*" + extension)
			.then(res => {
				allFoundFiles = res;
				doneFoundFiles = true;
			});

		setTimeout(checkDoneFindFiles, 100);
		function checkDoneFindFiles() {
			if (!doneIgnoreFiles || !doneFoundFiles) {
				setTimeout(checkDoneFindFiles, 100);
			} else {
				loadIgnoreFiles();
			}
		}

		let foldersToBeIgnored: string[] = [];
		let ignoreFilesLoaded = 0;

		function loadIgnoreFiles() {
			for (const ignoreFile of gitIgnoreFiles) {
				vscode.workspace.openTextDocument(ignoreFile)
					.then(doc => {
						for (let line of doc.getText().split(/\r?\n/)) {
							if (line.startsWith("/") || line.endsWith("/")) {
								let folder = getFolder(ignoreFile.path);
								if (!line.endsWith("/")) { line += "/"; }
								foldersToBeIgnored.push(joinPaths(folder, line));
							}
						}
						ignoreFilesLoaded++;
					});
			}

			setTimeout(checkDoneLoadIgnoreFiles, 100);
			function checkDoneLoadIgnoreFiles() {
				if (ignoreFilesLoaded < gitIgnoreFiles.length) {
					setTimeout(checkDoneLoadIgnoreFiles, 100);
				} else {
					delIgnoredFiles();
				}
			}
		}

		function delIgnoredFiles() {
			for (let index = allFoundFiles.length - 1; index >= 0; index--) {
				const element = allFoundFiles[index];
				if (isToDelete(element)) {
					allFoundFiles.splice(index, 1);
				}
			}

			function isToDelete(element: vscode.Uri): boolean {
				let elementFolder = getFolder(element.path);
				for (const folderToBeIgnored of foldersToBeIgnored) {
					if (elementFolder.startsWith(folderToBeIgnored)) {
						return true;
					}
				}
				return false;
			}

			findMaxErrCode();
		}

		let maxErrCodeFound = 0;
		let foundFilesLoaded = 0;

		function findMaxErrCode() {
			for (const foundFile of allFoundFiles) {
				vscode.workspace.openTextDocument(foundFile)
					.then(doc => {
						let starting = 0;
						while (true) {
							let text = doc.getText();
							let found = text.indexOf("(ErrCode-", starting);
							if (found > -1) {
								let end = text.indexOf(")", found + 9);
								if (end > -1) {
									let errCodeText = text.substring(found + 9, end);
									try {
										let errCodeVal = parseInt(errCodeText);
										if (errCodeVal > maxErrCodeFound) {
											maxErrCodeFound = errCodeVal;
										}
									} catch (_) {
									}
									starting = end + 1;
								} else {
									break;
								}
							} else {
								break;
							}
						}
						foundFilesLoaded++;
					});
			}

			setTimeout(checkMaxErrCodeFound, 100);
			function checkMaxErrCodeFound() {
				if (foundFilesLoaded < allFoundFiles.length) {
					setTimeout(checkMaxErrCodeFound, 100);
				} else {
					insertErrCode();
				}
			}
		}

		function insertErrCode() {
			let newErrCode = (maxErrCodeFound + 1).toString();
			while (newErrCode.length < 6) {
				newErrCode = "0" + newErrCode;
			}
			newErrCode = "(ErrCode-" + newErrCode + ")";
			const position = editor.selection.end;
			editor.edit(editBuilder => {
				editBuilder.insert(position, newErrCode);
			});
		}
	});

	context.subscriptions.push(disposable);
}

export function deactivate() { }
