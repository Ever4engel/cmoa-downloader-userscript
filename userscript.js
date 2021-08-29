// ==UserScript==
// @name         cmoa.jp Downloader
// @namespace    https://amytruong.dev/
// @version      0.1
// @description  Downloads comic pages from cmoa.jp
// @author       Amy Truong
// @match        *://*.cmoa.jp/bib/speedreader/speed.html?cid=*&u0=*&u1=*
// @icon         https://www.google.com/s2/favicons?domain=tampermonkey.net
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @grant        GM_download
// @resource     bt https://cdn.jsdelivr.net/npm/bootstrap@5.1.0/dist/css/bootstrap.min.css
// @require      https://cdn.jsdelivr.net/npm/bootstrap@5.1.0/dist/js/bootstrap.bundle.min.js
// @require      https://kit.fontawesome.com/63c38a0de9.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/jszip/3.7.1/jszip.min.js
// ==/UserScript==

function validatePagesField() {
    const speedbinb = SpeedBinb.getInstance('content');
    const totalPages = speedbinb.total - 1;

    const pagesField = document.querySelector('#pages-field');
    const fieldValue = pagesField.value;
    const pagesList = fieldValue.split(',');

    const isValidPage = num => !isNaN(num) && (parseInt(num) > 0) && (parseInt(num) <= totalPages);
    const isValidSingle = range => (range.length == 1) && isValidPage(range[0]);
    const isValidRange = range => (range.length == 2) && range.every(isValidPage) && (parseInt(range[0]) < parseInt(range[1]));

    for (const x of pagesList) {
        let pages = x.split('-');
        if (!isValidSingle(pages) && !isValidRange(pages)) {
            pagesField.setCustomValidity("Invalid page range, use eg. 1-5, 8, 11-13");
            return;
        }
    }
    pagesField.setCustomValidity("");
}

function setUpValidation() {
  'use strict'

  // Fetch all the forms we want to apply custom Bootstrap validation styles to
  var forms = document.querySelectorAll('.needs-validation')

  // Loop over them and prevent submission
  Array.prototype.slice.call(forms)
    .forEach(function (form) {
      form.addEventListener('submit', function (event) {
        if (!form.checkValidity()) {
          event.preventDefault()
          event.stopPropagation()
        }

        form.classList.add('was-validated')
      }, false)
    })
}

function downloadPage(pageNumber) {
    const speedbinb = SpeedBinb.getInstance('content');
    const pageInfo = speedbinb.Xt.vn.page;
    const pageHeight = pageInfo[pageNumber].image.orgheight;
    const pageWidth = pageInfo[pageNumber].image.orgwidth;

    const imgs = document.querySelectorAll(`#content-p${pageNumber} img`);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.height = pageHeight;
    canvas.width = pageWidth;

    const topY = pageHeight * (parseFloat(imgs[0].parentElement.style.top) / 100);
    const middleY = pageHeight * (parseFloat(imgs[1].parentElement.style.top) / 100);
    const bottomY = pageHeight * (parseFloat(imgs[2].parentElement.style.top) / 100);

    ctx.drawImage(imgs[0], 0, topY);
    ctx.drawImage(imgs[1], 0, middleY);
    ctx.drawImage(imgs[2], 0, bottomY);

    const blob = canvas.toDataURL('image/jpeg', 1.0);
    const details = {
        'url': blob,
        'name': `${pageNumber}.jpeg`
    };
    GM_download(details);
}

function downloadComic() {
    const speedbinb = SpeedBinb.getInstance('content');
    let nextPage = 1;
    // const totalPages = speedbinb.total - 1;
    const totalPages = 1;

    speedbinb.moveTo(0);

    while (nextPage <= totalPages) {
        while (document.querySelector(`#content-p${nextPage}`)) {
            const imgs = document.querySelectorAll(`#content-p${nextPage} img`);
            const blobs = Array.from(imgs).map((img) => img.src);
            downloadPage(imgs);
        }
        speedbinb.moveTo(nextPage - 1);
    }
}

function addButton() {
    const header = document.querySelector('#menu_header');
    let div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.left = '20%';
    const button = document.createElement('button');
    button.innerHTML = 'Download';
    button.addEventListener('click', () => {
        downloadPage(1);
    });
    button.classList.add('btn');
    button.classList.add('btn-primary');
    div.appendChild(button);
    header.appendChild(div);
}


function addDownloadSidebar() {
    const sidebar = document.createElement('div');
    sidebar.id = 'download-sidebar';
    sidebar.classList.add('offcanvas');
    sidebar.classList.add('offcanvas-end');
    sidebar.classList.add('rounded-start');
    sidebar.setAttribute('tabindex', '-1');
    sidebar.setAttribute('aria-labelledby', '#download-sidebar-title');

    sidebar.innerHTML =
    `<div class="offcanvas-header">
         <h5 id="download-sidebar-title">Download Options</h5>
         <button type="button" class="btn-close text-reset" data-bs-dismiss="offcanvas" aria-label="Close"></button>
     </div>
     <div class="offcanvas-body">
         <div class="alert alert-warning d-flex align-items-center" role="alert">
             <i class="fas fa-exclamation-triangle bi flex-shrink-0 me-2" width="24" height="24" role="img" aria-label="Warning"></i>
             <div style="padding-left: 0.5em">Do not close this tab or interact with the reader while download is in progress.</div>
         </div>
         <form class="needs-validation" novalidate>
             <div class="mb-3">
                 <label for="folder-name-field" class="form-label">Download folder name</label>
                 <input type="text" id="folder-name-field" name="folder-name" class="form-control" placeholder="Leave blank for comic name">
             </div>
             <label for="pages-field" class="form-label">Pages</label>
             <div class="mb-3">
                 <input type="text" id="pages-field" name="pages" class="form-control" placeholder="eg. 1-5, 8, 11-13">
                 <div class="invalid-feedback">Invalid page range, use eg. 1-5, 8, 11-13</div>
             </div>
             <div class="mb-3">
                 <button type="submit" class="btn btn-primary">Download</button>
             </div>
          </form>
          <div class="progress">
              <div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" style="width: 25%;" aria-valuenow="25" aria-valuemin="0" aria-valuemax="100"></div>
          </div>
     </div>`;
    document.body.append(sidebar);
    const pagesField = document.querySelector('#pages-field');
    pagesField.addEventListener('change', validatePagesField);
    setUpValidation();

    const sidebarCss =
    `#download-sidebar .offcanvas-header {
         border-bottom: 1px solid var(--bs-gray-300);
     }
     #download-sidebar h5 {
         margin-bottom: 0;
     }`;
    GM_addStyle(sidebarCss);
}

function addDownloadTab() {
    const tabAnchor = document.createElement('a');
    tabAnchor.id = 'download-tab-anchor';
    tabAnchor.setAttribute('data-bs-toggle', 'offcanvas')
    tabAnchor.setAttribute('href', '#download-sidebar');
    tabAnchor.setAttribute('role', 'button');
    tabAnchor.setAttribute('aria-label', 'Open Download Options');

    const tab = document.createElement('div');
    tab.id = 'download-tab';
    tab.classList.add('rounded-start');

    const icon = document.createElement('i');
    icon.id = 'download-icon';
    icon.classList.add('fas');
    icon.classList.add('fa-file-download');

    tabAnchor.appendChild(tab);
    tab.appendChild(icon);
    document.body.append(tabAnchor);

    const tabCss =
    `#download-tab {
         background-color: var(--bs-orange);
         color: white;
         position: absolute;
         top: 3em;
         right: 0;
         z-index: 20;
         padding: 0.75em;
     }
     #download-tab:hover {
         background-color: #ca6510;
     }`;
    GM_addStyle(tabCss);
}


window.addEventListener('load', () => {
    GM_addStyle(GM_getResourceText("bt"));
    addDownloadSidebar();
    addDownloadTab();
});
