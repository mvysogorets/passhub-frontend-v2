import Dropdown from "react-bootstrap/Dropdown";

function SearchTypeSelector(props) {

    return (
        <div>
            <Dropdown
                onSelect={(value) => {
                    props.onSearchTypeChange(value);
                }}
                style={{ float: "right" }}
            >
                <Dropdown.Toggle
                    variant="secondary"
                    style={{
                        background: "transparent",
                        color: "var(--body-color)",
                        border: "none",
                        boxShadow: "none",
                        margin: 0,
                    }}
                >
                    {props.searchType}
                </Dropdown.Toggle>
                <Dropdown.Menu align="left">
                    <Dropdown.Item eventKey="--All--">--All--</Dropdown.Item>
                    <Dropdown.Item eventKey="Cards">Cards</Dropdown.Item>
                    <Dropdown.Item eventKey="Files">Files</Dropdown.Item>
                    <Dropdown.Item eventKey="Address">Address</Dropdown.Item>
                    <Dropdown.Item eventKey="Passkeys">Passkeys</Dropdown.Item>
                </Dropdown.Menu>
            </Dropdown>
        </div>
    );
}

export default SearchTypeSelector;