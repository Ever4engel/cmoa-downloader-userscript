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

function getTitle() {
    return __sreaderFunc__.contentInfo.items[0].Title;
}

function getAuthors() {
    return __sreaderFunc__.contentInfo.items[0].Authors.map(x => x.Name); // Returns array of authors, ex. ['Author1', 'Author2']
}

function getVolume() {
    return parseInt(__sreaderFunc__.contentInfo.items[0].ShopURL.split('/').at(-2));
}

function getPageCount() {
    return SpeedBinb.getInstance('content').total - 1;
}

function setUpComicInfo() {
    const titleListItem = document.querySelector('#comic-title');
    const authorListItem = document.querySelector('#comic-author');
    const volumeListItem = document.querySelector('#comic-volume');
    const pageCountListItem = document.querySelector('#comic-page-count');

    const titleDiv = document.createElement('div');
    titleDiv.innerText = getTitle();
    titleListItem.appendChild(titleDiv);

    const authors = getAuthors();
    for (let i = 0; i < authors.length; i++) {
        const authorDiv = document.createElement('div');
        authorDiv.innerText = authors[i];
        authorListItem.appendChild(authorDiv);
    }

    const volumeDiv = document.createElement('div');
    volumeDiv.innerText = getVolume();
    volumeListItem.appendChild(volumeDiv);

    const pageCountDiv = document.createElement('div');
    pageCountDiv.innerText = getPageCount();
    pageCountListItem.appendChild(pageCountDiv);

    const speedbinb = SpeedBinb.getInstance('content');
    speedbinb.removeEventListener('onPageRendered', setUpComicInfo);
}

function convertToFileName(string) {
    return string.replace(/[/\\?%*:|"<>]/g, '-');
}

function setDefaultDownloadName() {
    const downloadNameField = document.querySelector('#download-name-field');
    downloadNameField.placeholder = convertToFileName(getTitle().concat(' ', getVolume()));
}

function isValidFileName(string) {
    const regex = new RegExp('[/\\?%*:|"<>]', 'g');
    return !regex.test(string);
}

/*
function setUpDownloadSidebarInfo() {
    const isComicInfoInitialize = document.querySelector('#comic-title').childElementCount > 1;
    if (!isComicInfoInitialize) {
        setUpComicInfo();
    }
    setDefaultDownloadName();
}
*/

function validateDownloadNameField() {
    const downloadNameField = document.querySelector('#download-name-field');
    if (isValidFileName(downloadNameField.value)) {
        downloadNameField.setCustomValidity('');
    } else {
        downloadNameField.setCustomValidity('Special characters /\?%*:|"<>] are not allowed');
    }
}

function validatePagesField() {
    const speedbinb = SpeedBinb.getInstance('content');
    const totalPages = speedbinb.total - 1;

    const pagesField = document.querySelector('#pages-field');
    const fieldValue = pagesField.value;
    const pagesList = fieldValue.split(',');

    const isValidPage = num => !isNaN(num) && (parseInt(num) > 0) && (parseInt(num) <= totalPages);
    const isValidSingle = range => (range.length === 1) && isValidPage(range[0]);
    const isValidRange = range => (range.length === 2) && range.every(isValidPage) && (parseInt(range[0]) < parseInt(range[1]));

    for (const x of pagesList) {
        let pages = x.split('-');
        if (!isValidSingle(pages) && !isValidRange(pages)) {
            pagesField.setCustomValidity('Invalid page range, use eg. 1-5, 8, 11-13');
            return;
        }
    }
    pagesField.setCustomValidity('');
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

function generatePageArray() {
    const isEmpty = string => !string.trim().length;

    const pagesField = document.querySelector('#pages-field');
    let fieldValue = pagesField.value;

    if (isEmpty(fieldValue)) {
        const speedbinb = SpeedBinb.getInstance('content');
        const totalPages = speedbinb.total - 1;
        return [[1, totalPages]];
    }

    const pagesList = fieldValue.split(',');
    let pageArray = [];

    for (const x of pagesList) {
        let pages = x.split('-');
        if (pages.length === 1) {
            pageArray.push([parseInt(pages[0]), parseInt(pages[0])]);
        } else if (pages.length === 2) {
            pageArray.push([parseInt(pages[0]), parseInt(pages[1])]);
        }
    }

    pageArray.sort((a, b) => b[0] - a[0]);
    return pageArray;
}

function mergePageIntervals(pageArray) {
    if (pageArray.length <= 1) {
        return pageArray;
    }
    const start = 0, end = 1;
    let result = [];
    let newInterval = pageArray[0];
    for (let i = 1; i < pageArray.length; i++) {
        let currentInterval = pageArray[i];
        if (currentInterval[start] <= newInterval[end]) {
            newInterval[end] = Math.max(newInterval[end], currentInterval[end]);
        } else {
            result.push(newInterval);
            newInterval = currentInterval;
        }
    }
    result.push(newInterval);
    return result;
}

function getPageIntervals() {
    return mergePageIntervals(generatePageArray());
}

function setUpDownloadSidebarForm() {
    const pagesField = document.querySelector('#pages-field');
    pagesField.addEventListener('change', validatePagesField);

    const downloadNameField = document.querySelector('#download-name-field');
    downloadNameField.addEventListener('change', validateDownloadNameField);

    setUpValidation();

    const form = document.querySelector('#download-sidebar form');
    form.addEventListener('submit', submitForm);
}

function setUpKeyboardEventListeners() {
    const stopProp = function(e) { e.stopPropagation(); };
    const sidebar = document.querySelector('#download-sidebar');
    sidebar.addEventListener('shown.bs.offcanvas', function() {
        document.addEventListener('keydown', stopProp, true);
        document.addEventListener('wheel', stopProp, true);
    });
    sidebar.addEventListener('hidden.bs.offcanvas', function() {
        document.removeEventListener('keydown', stopProp, true);
        document.removeEventListener('wheel', stopProp, true);
    });
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

function testDownload(pageNumber) {
    const content = document.querySelector(`#content-p${pageNumber}`);
    if (content) {
        console.log(`Downloaded page ${pageNumber}`);
        this.dispatchEvent(new CustomEvent('downloadProcessed', { bubbles: true, detail: { successful: true } }))
    } else {
        console.log(`Error: page ${pageNumber} not loaded yet`);
        this.dispatchEvent(new CustomEvent('downloadProcessed', { bubbles: true, detail: { successful: false } }))
    }
}

function downloadComic(pageIntervals) {
    const speedbinb = SpeedBinb.getInstance('content');
    for (let i = 0; i < pageIntervals.length; i++) {
        const interval = pageIntervals[i], start = 0, end = 1;
        let nextPage = interval[start];
        document.addEventListener('downloadProcessed', (e) => {
            if (e.detail.successful) {
                nextPage++;
            }
        });
        while (nextPage <= interval[end]) {
            console.log(nextPage);
            if (document.querySelector(`#content-p${nextPage}`)) {
                testDownload(nextPage);
            } else {
                const downloadFunc = function() { testDownload(nextPage); speedbinb.removeEventListener('onPageRendered', downloadFunc); };
                speedbinb.moveTo(nextPage - 1);
                speedbinb.addEventListener('onPageRendered', downloadFunc);
            }
        }
    }
}

function submitForm(e) {
    e.preventDefault();
    console.log('Form submitted');
    downloadComic(getPageIntervals());
}

function addDownloadTab() {
    const tabAnchor = document.createElement('a');
    tabAnchor.id = 'download-tab-anchor';
    tabAnchor.setAttribute('data-bs-toggle', 'offcanvas')
    tabAnchor.setAttribute('href', '#download-sidebar');
    tabAnchor.setAttribute('role', 'button');
    tabAnchor.setAttribute('aria-label', 'Open Download Options');
    // tabAnchor.addEventListener('click', setUpDownloadSidebarInfo);

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
             <div style="padding-left: 0.5em">Interacting with the reader is disabled while sidebar is open.</div>
         </div>
         <ul class="list-group mb-3">
             <li class="list-group-item" id="comic-title">
                 <div class="fw-bold">Title</div>
             </li>
             <li class="list-group-item" id="comic-author">
                 <div class="fw-bold">Author</div>
             </li>
             <li class="list-group-item" id="comic-volume">
                 <div class="fw-bold">Volume</div>
             </li>
             <li class="list-group-item" id="comic-page-count">
                 <div class="fw-bold">Page Count</div>
             </li>
         </ul>
         <form class="needs-validation" novalidate>
             <div class="mb-3">
                 <label for="download-name-field" class="form-label">Download file name</label>
                 <textarea type="text" id="download-name-field" name="download-name" class="form-control" placeholder="Leave blank for comic name"></textarea>
                 <div class="invalid-feedback">Special characters /\?%*:|"<>] are not allowed</div>
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
    setUpDownloadSidebarForm();
    setUpKeyboardEventListeners();

    const sidebarCss =
    `#download-sidebar {
         user-select: text;
         -moz-user-select: text;
         -webkit-user-select: text;
         -ms-user-select: text;
     }
     #download-sidebar .offcanvas-header {
         border-bottom: 1px solid var(--bs-gray-300);
     }
     #download-sidebar h5 {
         margin-bottom: 0;
     }`;
    GM_addStyle(sidebarCss);
}

window.addEventListener('load', () => {
    GM_addStyle(GM_getResourceText("bt"));
    addDownloadSidebar();
    addDownloadTab();
    const speedbinb = SpeedBinb.getInstance('content');
    speedbinb.addEventListener('onPageRendered', setUpComicInfo);
});