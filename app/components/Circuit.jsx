import ReactGridLayout from 'react-grid-layout';
import React, { useEffect } from 'react';
import Operator from './Operator';
import { margin, operators, size } from '../data/operators';

// constants describing grid layout
const circuitContainerPadding = {
    x: 0,
    y: 0,
};
const containerPadding = {
    x: 10,
    y: 10,
};
const circuitLineMarginL = 40;
const circuitLineMarginR = 50;
const gridDimenY = 3; // Number of rows in the grid (qubits)
const gridDimenX = 10; // Number of columns in the grid

export default ({ droppingItem }) => {
    const [layout, setLayout] = React.useState([]); /* Layout of the circuit as 
    an array of objects, each representing a gate with properties:
        i - unique id
        gateId - the ID of the gate corresponding to the operator from operators.js
        x - x position in the grid (column)
        y - y position in the grid (row or qubit)
        w - width (number of columns it occupies, usually 1)
        h - height of the gate (range of qubits it occupies)
    */
    const [droppingItemHeight, setDroppingItemHeight] = React.useState(1); // Height of the dropping item, used to adjust the placeholder height during drag-and-drop of a new gate
    const [draggedItemId, setDraggedItemId] = React.useState(null); // ID of the item being dragged, used to handle drag-and-drop events of existing gates
    
    const [xRayStates, setXRayStates] = React.useState({});

    const toggleXRayMode = (id) => {
        setLayout(prevLayout => {
            const gateItem = prevLayout.find(item => item.i === id);
            const gate = operators.find(op => op.id === gateItem.gateId);

            const isCurrentlyXRay = xRayStates[id];
            const minX = Math.min(...(gate.components?.map(c => c.x) ?? [0]));
            const maxX = Math.max(...(gate.components?.map(c => c.x) ?? [0]));
            const newW = isCurrentlyXRay ? 1 : (maxX - minX + 1);
            const delta = newW - gateItem.w;

            return prevLayout.map(item => {
                if (item.i === id) {
                    return {
                        ...item,
                        w: newW,
                    };
                } else if (item.x > gateItem.x) {
                    return {
                        ...item,
                        x: item.x + delta,
                    };
                }
                return item;
            });
        });

        setXRayStates(prev => ({
            ...prev,
            [id]: !prev[id],
        }));
    };

    const isXRayMode = (id) => xRayStates[id] === true;

    const maxColUsed = Math.max(
        gridDimenX,
        ...layout.map(item => item.x + item.w)
    );


    // Set the dropping item height for placeholder based on the height described in the operators array
    useEffect(() => {
        if (!droppingItem) {
            return;
        }
        setDroppingItemHeight(operators.find(op => op.id === droppingItem)?.height ?? 1);
    }, [droppingItem]);

    // Update the layout
    const handleCircuitChange = (newCircuit) => {
        setLayout(newCircuit.layout);
    };

    // Handle dropping a new gate onto the circuit
    const onDrop = (newLayout, layoutItem, event) => {
        event.preventDefault();

        let gateId = event.dataTransfer.getData('gateId');
        const isCustomGate = event.dataTransfer.getData('isCustomGate') === 'true';
        const height = operators.find(op => op.id === gateId)?.height || 1;

        if (layoutItem.y + height > gridDimenY) {
            return; // Prevent dropping if the gate exceeds the grid height
        }
        
        const newItem = {
            i: new Date().getTime().toString(), // unique id
            gateId: gateId,
            x: layoutItem.x,
            y: layoutItem.y,
            w: 1,
            h: height,
            isResizable: false,
        };
        const updatedLayout = newLayout.filter(
            item => item.i !== '__dropping-elem__' && item.y < gridDimenY,
        ).map(item => {
            return {
                ...item,
                gateId: layout.find(i => i.i === item.i)?.gateId,
            };
        });
        updatedLayout.push(newItem);

        handleCircuitChange({
            layout: updatedLayout,
        });

        return;
    };

    // Update the layout when a gate is dragged and dropped
    const handleDragStop = (newLayout) => {
        if (!draggedItemId) {
            console.error('Dragged item ID is missing on drag stop!');
            return;
        }
        const updatedLayout = newLayout.filter(
            item => item.i !== '__dropping-elem__' && item.y < gridDimenY,
        ).map(item => {
            return {
                ...item,
                gateId: layout.find(i => i.i === item.i)?.gateId,
            };
        });
        setLayout(updatedLayout);
        setDraggedItemId(null);
    }

    return (
        <div className='relative bg-white border-2 border-gray-200 m-2 shadow-lg rounded-lg'
            style={{
                boxSizing: 'content-box',
                padding: `${circuitContainerPadding.y}px ${circuitContainerPadding.x}px`,
                minWidth: `${2 * containerPadding.x + maxColUsed * (size + margin.x)}px`,
                width: `${2 * containerPadding.x + (maxColUsed) * (size + margin.x) + size / 2 + margin.x}px`,
                height: `${2 * containerPadding.y + (gridDimenY) * (size + margin.y) - margin.y}px`, // +1 to account for classical bit
                overflow: 'hidden',
            }}
        >
            <ReactGridLayout
                allowOverlap={false}
                layout={layout}
                useCSSTransforms={false}
                className="relative z-20"
                cols={maxColUsed}
                compactType={null}
                preventCollision={true}
                containerPadding={[containerPadding.x, containerPadding.y]}
                droppingItem={{
                    i: '__dropping-elem__',
                    h: droppingItemHeight,
                    w: 1,
                }}
                isBounded={false}
                isDroppable={true}
                margin={[margin.x, margin.y]}
                onDrag={() => {
                    const placeholderEl = document.querySelector(
                        '.react-grid-placeholder',
                    );
                    if (placeholderEl) {
                        placeholderEl.style.backgroundColor =
                            'rgba(235, 53, 53, 0.2)';
                        placeholderEl.style.border = '2px dashed blue';
                    }
                }}
                onDragStart={(layout, oldItem) => {
                    const draggedItemId = oldItem?.i;
                    if (!draggedItemId) {
                        console.error('Dragged item ID is missing!');
                        return;
                    }
                    setDraggedItemId(prev => {
                        return draggedItemId;
                    });
                }}
                onDragStop={(layout, oldItem, newItem) => {
                    handleDragStop(layout);
                }}
                onDrop={onDrop}
                // preventCollision={true}
                rowHeight={size}
                style={{
                    minHeight: `${2 * containerPadding.y + gridDimenY * (size + margin.y) - margin.y}px`,
                    maxHeight: `${2 * containerPadding.y + gridDimenY * (size + margin.y) - margin.y}px`,
                    overflowY: 'visible',
                    marginLeft: `${circuitLineMarginL}px`,
                    marginRight: `${circuitLineMarginR}px`,
                }}
                width={
                    maxColUsed *
                    (size + margin.x)
                }
            >
                {layout?.map((item, index) => {
                    const gate = operators.find(op => op.id === item.gateId);
                    if (!gate) {
                        console.warn(`Gate with ID ${item.gateId} not found in operators.`);
                        return null;
                    }

                    const xray = isXRayMode(item.i);
                    const computedWidth = gate.isCustom && xray
                        ? Math.max(...(gate.components?.map(c => c.x) ?? [0])) + 1
                        : gate.width;
                    return (
                        <div
                            className="grid-item relative group"
                            data-grid={item}
                            key={`${item.i}`}
                        >
                            <Operator
                                itemId={item.i}
                                symbol={gate.icon}
                                height={gate.height}
                                width={gate.width}
                                fill={gate.fill}
                                isCustom={gate.isCustom}
                                components={gate.components ?? []}
                                isXRayMode={xray}
                                onToggleXRay={() => toggleXRayMode(item.i)}
                            />
                        </div>
                    );
                })}
            </ReactGridLayout>
            <div className="absolute top-0 left-0 z-10"
                style={{
                    width: `${2 * containerPadding.x + (maxColUsed) * (size + margin.x) + size / 2}px`,
                }}>
                {[...new Array(gridDimenY)].map((_, index) => (
                    <div
                        className={'absolute flex group'}
                        key={index}
                        style={{
                            height: `${size}px`,
                            width: '100%',
                            top: `${circuitContainerPadding.y + containerPadding.y + index * size + size / 2 + index * margin.y}px`,
                            paddingLeft: `${circuitLineMarginL}px`,
                        }}
                    >
                        <div className="absolute top-0 -translate-y-1/2 left-2 font-mono">
                            Q<sub>{index}</sub>
                        </div>
                        <div
                            className="h-[1px] bg-gray-400 grow"
                            data-line={index}
                            data-val={index + 1}
                            key={`line-${index}`}
                        ></div>
                    </div>
                ))}
            </div>

        </div>
    );
}