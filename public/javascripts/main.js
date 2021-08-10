window.onload = () => {

  const socket = io("http://localhost:3000", {reconnectionDelayMax: 10000, autoConnect: false,});
  let retryingInterval;

  $(document).on('contextmenu', (event)=>{
    event.preventDefault();
  })

  const previewResizedSection = document.querySelector(
    "#previewResizedSection"
  );
  const sendResizeCmdBtn = document.querySelector("#sendResizeCmdBtn");
  const previewSection = document.querySelector("#previewSection");
  const submitConfigurationBtn = document.querySelector(
    "#submitConfigurationBtn"
  );
  const sourceFolder = document.querySelector("#sourceFolder");
  const destinationFolder = document.querySelector("#destinationFolder");
  const remoteServerURL = document.querySelector("#remoteServerURL");

  getImages("/catalog", previewSection, "original");
  getImages("/catalog/resized", previewResizedSection, "resized");

  sendResizeCmdBtn.addEventListener("click", (event) => {
    event.preventDefault();

    fetch("/catalog/resizeAll", {
      method: "GET",
    })
      .then((data) => {
        if (data.status != 200) {
          throw new Error("An error occurs - please try again");
        }

        Swal.fire(
          "Youupi. Uploaded",
          "Images have been resized successfully",
          "success"
        );

        getImages("/catalog", previewSection, "original");
        getImages("/catalog/resized", previewResizedSection, "resized");
      })
      .catch((err) => {
        Swal.fire("An error occurs", err.message, "success");
      });
  });

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
            getImages("/catalog", previewSection, "original");
            getImages("/catalog/resized", previewResizedSection, "resized");
          }
        );
      })
      .catch((error) => {
        Swal.fire("Error :(", error.message, "error");
      });
  });

  (function getConfiguration() {
    fetch('/catalog/getConfig').then(async(data) => {
      const response = await data.json();
      const [sourceFolderValueFromServer, destinationFolderValueFromServer, remoteServerURLValueFromServer] = [response.sourceFolder, response.destinationFolder, response.remoteServerURL];
      sourceFolder.value = sourceFolderValueFromServer;
      destinationFolder.value = destinationFolderValueFromServer;
      remoteServerURL.value = remoteServerURLValueFromServer;
    });
  })();

  function getImages(url, containerPane, prefix="default") {
    containerPane.innerHTML = "";

    const accordion = document.createElement("div");
    accordion.classList = "accordion accordion-flush";
    accordion.id = prefix;

    fetch(url).then(async (data) => {
      const catalog = await data.json();
      for (let topCategory in catalog) {
        const topCategoryTitle = topCategory;


        const accordionItem = document.createElement("div");
        accordionItem.classList = "accordion-item";

        accordion.append(accordionItem); // append

        const accordionHeader = document.createElement("h2");
        accordionHeader.classList = "accordion-header";
        accordionHeader.id = prefix+"heading"+topCategoryTitle;

        accordionItem.append(accordionHeader); //append
        
        const accordionButton = document.createElement("button");
        accordionButton.classList = "accordion-button collapsed";
        accordionButton.setAttribute("data-bs-toggle", "collapse");
        accordionButton.setAttribute("data-bs-target", "#"+prefix+topCategoryTitle);
        accordionButton.setAttribute("aria-expanded", "false");

        accordionButton.setAttribute("aria-controls", prefix+topCategoryTitle);
        accordionButton.innerText = topCategoryTitle;

        accordionHeader.appendChild(accordionButton); // append

        const accordionContent = document.createElement("div");
        accordionContent.id = prefix+topCategoryTitle;
        accordionContent.classList = "accordion-collapse collapse";
        accordionContent.setAttribute("aria-labelledby", prefix+"heading"+topCategoryTitle);
        accordionContent.setAttribute("data-bs-parent", "#"+prefix);

        accordionItem.appendChild(accordionContent);
        
        const accordionBody = document.createElement("div");
        accordionBody.classList = "accordion-body";
        accordionContent.appendChild(accordionBody);

        topCategory = catalog[topCategory];
        for (let sku in topCategory) {
          const skuTitle = sku;
          sku = topCategory[sku];
          for (let color in sku) {
            const title = document.createElement("h6");
            const colorTitle = document.createElement('span');
            colorTitle.innerText = color;
            colorTitle.style.color = color;
            title.innerText = `/${skuTitle}/`;
            title.append(colorTitle);
            accordionBody.appendChild(title);
            color = sku[color];
            const container = document.createElement("div");
            container.classList = "row m-0";
            containerPane.appendChild(container);
            containerPane.appendChild(accordion);
            accordionBody.appendChild(container);
            for (let url of color) {
              const r = showPreview(url, container);
            }
          }
        }
      }
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

    const previewCardBody = document.createElement("div");
    previewCardBody.className = "card-body";

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
      `<p>[${date}] [<span style='color: ${color}'>${status}</span>] ${message}</p>`
    );
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
    
    socket.on('syncFolderChanged', (message) => {
      outputMessage(message, "socket", "yellow");
    });
    
    socket.on('syncStarted', (message) => {
      outputMessage(message, "socket", "red");
    });
    
    socket.on('uploadingStart', (message) => {
      outputMessage(message, "syncing", "cyan");
    });
    
    socket.on('uploadingEnd', (message) => {
      outputMessage(message, "syncing", "#29b6f6");
    });
    
    socket.on('uploadingError', (message) => {
      console.log(message);
      outputMessage(message.message || "sync error", "uploading", "red");
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
