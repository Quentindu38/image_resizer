window.onload = () => {

  const socket = io("http://localhost:3000", {reconnectionDelayMax: 10000, autoConnect: false,});
  let retryingInterval;

  $(document).on('contextmenu', (event)=>{
    event.preventDefault();
  })

  const previewResizedSection = document.querySelector(
    "#previewResizedSection"
  );
  const sendResizeCmdBtn = document.querySelectorAll(".sendResizeCmdBtn");
  const submitConfigurationBtn = document.querySelector(
    "#submitConfigurationBtn"
  );
  const sourceFolder = document.querySelector("#sourceFolder");
  const destinationFolder = document.querySelector("#destinationFolder");
  const remoteServerURL = document.querySelector("#remoteServerURL");
  const loadMoreBtnNext = document.querySelector("#loadMoreBtnNext");
  const loadMoreBtnPrev = document.querySelector("#loadMoreBtnPrev");

  let images = [];
  let lastStop = 0;
  const limitLoaded = 50;

  getImages("/catalog/resized");

  sendResizeCmdBtn.forEach((btn => 
    btn.addEventListener("click", (event) => {
      event.preventDefault();
  
      fetch("/catalog/resizeAll", {
        method: "GET",
      })
        .then((data) => {
          if (data.status != 200) {
            throw new Error("An error occurs - please try again");
          }
  
          Swal.fire(
            "Cool :)",
            "The resize process has started. It'll will be running in the background. Don't close the app yet",
            "success"
          );
  
          getImages("/catalog/resized");
        })
        .catch((err) => {
          Swal.fire("An error occurs", err.message, "success");
        });
    })
  ));


  submitConfigurationBtn.addEventListener("click", (event) => {
    event.preventDefault();

    if (sourceFolder.value == "") {
      Swal.fire(
        "No folder set",
        "Please set the source folder string before continue",
        "error"
      );
      return;
    }
    
    if (destinationFolder.value == "") {
      Swal.fire(
        "No folder set",
        "Please set the destination folder string before continue",
        "error"
      );
      return;
    }
    
    if (remoteServerURL.value == "") {
      Swal.fire(
        "No url set",
        "Please enter the remote server url string before continue",
        "error"
      );
      return;
    }

    const data = { sourceFolder: sourceFolder.value, destinationFolder: destinationFolder.value, remoteServerURL: remoteServerURL.value };

    fetch("/catalog/config", {
      method: "POST",
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json" },
    })
      .then((data) => {
        Swal.fire("Cool :)", "Configuration saved successfully. You should close the app and start again", "success").then(
          () => {
            getImages("/catalog/resized", previewResizedSection);
          }
        );
      })
      .catch((error) => {
        Swal.fire("Error :(", error.message, "error");
      });
  });

  loadMoreBtnNext.addEventListener("click", (event) => {
    event.preventDefault();

    if(images.length > lastStop+limitLoaded) {
      feedPage(lastStop);
    }
  });
  
  console.log(lastStop);
  loadMoreBtnPrev.addEventListener("click", (event) => {
    event.preventDefault();

    if(lastStop-limitLoaded > 0) {
      feedPage(lastStop-2*limitLoaded);
    }
  });

  function feedPage(start = 0) {
    lastStop = start+limitLoaded;

    if(images.length <= lastStop) {
      lastStop = images.length;
    }

    previewResizedSection.innerHTML = "";
    let imagesToLoad = images.slice(start, lastStop);
    for (let url of imagesToLoad) {
      showPreview(url, previewResizedSection);
    }
  }

  (function getConfiguration() {
    fetch('/catalog/getConfig').then(async(data) => {
      const response = await data.json();
      const [sourceFolderValueFromServer, destinationFolderValueFromServer, remoteServerURLValueFromServer] = [response.sourceFolder, response.destinationFolder, response.remoteServerURL];
      sourceFolder.value = sourceFolderValueFromServer;
      destinationFolder.value = destinationFolderValueFromServer;
      remoteServerURL.value = remoteServerURLValueFromServer;
    });
  })();

  function getImages(url) {
    fetch(url).then(async (data) => {
      const catalog = await data.json();
      lastStop = 0;
      images = catalog;
      feedPage();
    });
  }

  function showPreview(url, container) {
    const previewContainer = document.createElement("div");
    previewContainer.classList = "col-lg-3 col-sm-6 col-12";

    const previewCard = document.createElement("div");
    previewCard.classList = "m-1 card";

    const imageElement = new Image();
    imageElement.src = url;
    imageElement.classList = "card-img-top";

    previewCard.appendChild(imageElement);
    previewContainer.appendChild(previewCard);
    container.appendChild(previewContainer);
    return previewContainer;
  }

  function outputMessage(message, status = "update", color = "white") {
    const appConsole = $("#app-console .console");
    const appConsoleContainer = $("#app-console");
    appConsoleContainer.scrollTop(appConsole.height()+100);
    const date = new Date().toDateString();
    const output = $(
      `<p>${message}</p>`
    );
    // appConsole.empty();
    appConsole.append(output);
  }

  // Init socket for the syncker
  initSync();
  async function initSync() {

    socket.connect();

    socket.on("connect", () => {
      clearInterval(retryingInterval);
      outputMessage("Connection with remote server established successfully", "socket", "#29b6f6");
    });

    socket.on('message', (message) => {
      outputMessage(message, "socket", "yellow");
    });
    
    socket.on('resizeOK', (message) => {
      Swal.fire(
        "Success",
        "Resizing process completed",
        "success"
      );
    });
    
    
    socket.on('disconnect', (message) => {
      outputMessage("Disconnected. Reconnecting ...", "socket", "yellow");
      retryingInterval = setInterval(async ()=>{
        outputMessage(`Retrying in 5s`, "socket", "yellow");
        await socket.connect();
      }, 5000);
    });
  }
};
