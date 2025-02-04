import React, { useContext } from 'react';

import { useLingui } from '@lingui/react';
import { t } from '@lingui/macro';
import makeStyles from '@mui/styles/makeStyles';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import NotifyContext from '../contexts/Notify';
import OutlinedInput from '@mui/material/OutlinedInput';

const useStyles = makeStyles((theme) => ({
	root: {
		'& .MuiOutlinedInput-notchedOutline': {
			borderWidth: 0,
		},
	},
}));

export default function Component(props) {
	const classes = useStyles();
	const { i18n } = useLingui();

	const notify = useContext(NotifyContext);
	const textAreaRef = React.createRef();

	const handleCopy = async () => {
		let success = false;

		if (!navigator.clipboard) {
			textAreaRef.current.select();

			try {
				success = document.execCommand('copy');
			} catch (err) {}

			textAreaRef.current.setSelectionRange(0, 0);
		} else {
			success = await writeText(navigator.clipboard.writeText(props.value));
		}

		if (success === true) {
			notify.Dispatch('success', 'clipboard', i18n._(t`Data copied to clipboard`));
		} else {
			notify.Dispatch('error', 'clipboard', i18n._(t`Error while copying data to clipboard`));
		}
	};

	const writeText = (promise) => {
		return promise
			.then(() => true)
			.catch((err) => {
				console.warn(err);
				return false;
			});
	};

	return (
		<FormControl variant="outlined" disabled={props.disabled} fullWidth>
			<InputLabel htmlFor={props.id}>{props.label}</InputLabel>
			<OutlinedInput
				className={classes.root}
				inputRef={textAreaRef}
				id={props.id}
				value={props.value}
				label={props.label}
				type={props.type}
				inputprops={{
					readOnly: true,
				}}
				size={props.size}
				endAdornment={
					<IconButton size="small" onClick={handleCopy}>
						<FileCopyIcon fontSize="small" />
					</IconButton>
				}
			/>
		</FormControl>
	);
}

Component.defaultProps = {
	id: null,
	label: '',
	value: '',
	disabled: false,
	multiline: false,
	rows: 1,
	type: 'text',
	readOnly: true,
	allowCopy: true,
	size: 'small',
	onChange: function (value) {},
};
