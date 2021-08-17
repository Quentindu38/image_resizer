const { MSICreator } = require('electron-wix-msi');

const build = async() => {
  // Step 1: Instantiate the MSICreator
  const msiCreator = new MSICreator({
    appDirectory: 'Marial-win32-x64/resources/app',
    description: 'Resizer App',
    exe: 'Marial-win32-x64/Maria',
    name: 'MDF Resizer',
    manufacturer: 'Christian Barnabe CHABI',
    version: '1.1.2',
    outputDirectory: './build',
    appIconPath: "./appIcon.ico"
  });  
  
  msiCreator.create().then(async(supportBinaries) => {
    supportBinaries.forEach(async (binary) => {
      await signFile(binary);
    });
    
    await msiCreator.compile();
  })
  
}

build();
