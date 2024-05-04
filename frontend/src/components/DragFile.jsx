import React, { useEffect, useRef, useState } from 'react';
import '../styles/DragFile.css';
import supportImageFormats from '../utils/supportFormats';
import Loading from './UI/Loading/Loading';
import ShowFiles from './ShowFiles';

const DragFiles = () => {
    const [format, setFormat] = useState(['JPEG', 'image']);
    const [files, setFiles] = useState({ NotConverted: [], Converted: [] });
    const [isProcessing, setProcessing] = useState(false);
    const [error, setError] = useState("");
    const [filesRef, setFilesRef] = useState([]);
    const inputFilesRef = useRef(null);

    useEffect(() => {
        if (isProcessing) {
            submitFiles()
        }
    }, [isProcessing])

    function createFiles(json, format, callback) {
        const list = Object.keys(json).map((key, index) => {
            const receivedBase64Data = json[key]['base64data'];
            const decodedBinaryData = atob(receivedBase64Data);
            const decodedUint8Array = new Uint8Array(decodedBinaryData.length);

            for (let i = 0; i < decodedBinaryData.length; i++) {
                decodedUint8Array[i] = decodedBinaryData.charCodeAt(i);
            }

            const blob = new Blob([decodedUint8Array]);
            blob.name = `${files.NotConverted[index].name.split('.')[0]}.${format.toLowerCase()}`;
            blob.lastModified = new Date();

            return new File([blob], `${files.NotConverted[index].name.split('.')[0]}.${format.toLowerCase()}`, { type: json[key]['mimetype'] });
        });

        callback(list);
    }

    async function submitFiles() {
        if (files.NotConverted.length !== 0) {
            const formData = new FormData();

            formData.append('toFormat', format);
            formData.append('fromFormat', files.NotConverted[0].type.split('/')[0]);

            for (var i = 0; i < files.NotConverted.length; i++) {
                formData.append('files', files.NotConverted[i]);
            }

            try {
                const response = await fetch('http://localhost:3000/', {
                    method: "POST",
                    body: formData
                })

                if (response.status == 200) {
                    response.json().then(json => {
                        createFiles(json, format[0], (list) => {
                            setFiles(prev => ({
                                NotConverted: [],
                                Converted: [...prev.Converted, ...list]
                            }));

                        });

                        setProcessing(false);
                    })
                }
                else if (response.status == 500) {
                    handleError("Problems on the server side, please try again later.");
                    clearAll();
                    setProcessing(false);
                }
            } catch {
                handleError("Server is offline, please try again later.");
                clearAll();
                setProcessing(false);
            }
        }
    }

    function selectFiles() {
        inputFilesRef.current.click();
    }

    function dragStart(e) {
        e.preventDefault();
    }

    function onDrop(e) {
        e.preventDefault();

        let fileItems = Array.from(e.dataTransfer.files);

        if (fileItems.length != 0) {
            let filesType = fileItems[0].type.split('/')[0]
            let filteredFiles = fileItems.filter((file) => file.type.split('/')[0] === filesType);

            if (filteredFiles.length !== fileItems.length) {
                handleError("The type of files must be the same.");
            }

            setFiles(prev => ({ ...prev, NotConverted: [...filteredFiles] }));
            setProcessing(true);
        }
    }

    function clearAll() {
        inputFilesRef.current.value = null;
        setFiles({ NotConverted: [], Converted: [] });
    }

    function filesHandler(e) {
        let fileItems = Array.from(e.target.files);

        if (fileItems.length != 0) {
            let filesType = fileItems[0].type.split('/')[0]

            let filteredFiles = fileItems.filter((file) => file.type.split('/')[0] === filesType);

            if (filteredFiles.length !== fileItems.length) {
                handleError("The type of files must be the same.");
            }

            setFiles(prev => ({ ...prev, NotConverted: [...filteredFiles] }));
            setProcessing(true);
        }
    }


    function deleteItem(index) {
        setFiles(prev => ({ ...prev, Converted: prev.Converted.filter(item => item !== prev.Converted[index]) }))
    }

    function getFileItemsRef(filesRef) {
        setFilesRef(filesRef)
    }

    function downloadAll() {
        filesRef.forEach((item) => {
            item.click();
        })
    }

    async function handleError(err) {
        setError(err)
        await new Promise((res) => setTimeout(() => res(), 10000));
        setError("");
    }

    return (
        <div className='Conteiner-drag-file'>
            <div className='Conteiner-format-file'>
                {supportImageFormats.map((frmt, index) => (
                    <span className={frmt[0] !== format[0] ? 'passive' : 'active'} onClick={() => setFormat(frmt)} key={index}>{frmt[0]}</span>
                ))}
            </div>

            <div className='Drag-file' onDragStart={dragStart} onDragOver={dragStart} onDragLeave={dragStart} onDrop={onDrop}>
                {
                    isProcessing ? <Loading /> :
                        <ShowFiles files={files.Converted} deleteItem={deleteItem} getFileItemsRef={getFileItemsRef} />
                }
                <input className='Input-files' type="file" ref={inputFilesRef} onChange={(e) =>
                    filesHandler(e)
                } multiple accept='image/*, video/*' />
            </div>

            {error != "" &&
                <div className='Error'>
                    <div>{error}</div>
                </div>
            }

            <div className='Container-buttons'>
                <button disabled={isProcessing} onClick={selectFiles} className='UploadFile-btn'>Upload Files</button>
                <button disabled={files.length == 0 || isProcessing} onClick={downloadAll} className='Download-all-btn'>Download all</button>
                <button disabled={files.length == 0 || isProcessing} onClick={clearAll} className='Clear-btn'>Clear all</button>
            </div>
        </div>
    );
}

export default DragFiles;
