import React from 'react';

import { faUsb } from '@fortawesome/free-brands-svg-icons';
import { useLingui } from '@lingui/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Trans, t } from '@lingui/macro';
import makeStyles from '@mui/styles/makeStyles';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

import FormInlineButton from '../../../misc/FormInlineButton';
import SelectCustom from '../../../misc/SelectCustom';
import Video from '../../../misc/coders/settings/Video';

const useStyles = makeStyles((theme) => ({
	gridContainer: {
		marginTop: '0.5em',
	},
}));

const initSettings = (initialSettings) => {
	if (!initialSettings) {
		initialSettings = {};
	}

	const settings = {
		device: 'none',
		format: 'nv12',
		framerate: '25',
		size: '1280x720',
		...initialSettings,
	};

	return settings;
};

const createInputs = (settings) => {
	const address = settings.device === 'custom' || settings.device === 'none' ? settings.deviceCustom : settings.device;
	const input = {
		address: address,
		options: [],
	};

	input.options.push('-f', 'video4linux2');
	input.options.push('-framerate', '' + settings.framerate);
	input.options.push('-video_size', settings.size);
	input.options.push('-input_format', settings.format);

	return [input];
};

function Source(props) {
	const classes = useStyles();
	const { i18n } = useLingui();
	const settings = initSettings(props.settings);

	const handleChange = (what) => (event) => {
		let data = {};

		if (['device', 'format', 'framerate', 'size'].includes(what)) {
			data[what] = event.target.value;
		}

		props.onChange({
			...settings,
			...data,
		});
	};

	const handleProbe = () => {
		props.onProbe(settings, createInputs(settings));
	};

	const filteredDevices = props.knownDevices.filter((device) => device.media === 'video');
	const options = filteredDevices.map((device) => {
		return {
			value: device.id,
			label: device.name + ' (' + device.id + ')',
		};
	});

	options.unshift({
		value: 'none',
		label: i18n._(t`Choose an input device ...`),
		disabled: true,
	});

	options.push({
		value: 'custom',
		label: i18n._(t`Custom ...`),
	});

	const videoDevices = (
		<SelectCustom
			options={options}
			label={<Trans>Video device</Trans>}
			customLabel={<Trans>Custom video device</Trans>}
			value={settings.device}
			onChange={handleChange('device')}
			variant="outlined"
			allowCustom
		/>
	);

	return (
		<Grid container alignItems="flex-start" spacing={2} className={classes.gridContainer}>
			<Grid item xs={12}>
				<Typography>
					<Trans>Select a device:</Trans>
				</Typography>
			</Grid>
			<Grid item xs={12}>
				{videoDevices}
			</Grid>
			<Grid item xs={12}>
				<Video.Format value={settings.format} onChange={handleChange('format')} allowCustom />
			</Grid>
			<Grid item xs={12}>
				<Video.Framerate value={settings.framerate} onChange={handleChange('framerate')} allowCustom />
			</Grid>
			<Grid item xs={12}>
				<Video.Size value={settings.size} onChange={handleChange('size')} allowCustom />
			</Grid>
			<Grid item xs={12}>
				<FormInlineButton onClick={handleProbe}>
					<Trans>Probe</Trans>
				</FormInlineButton>
			</Grid>
		</Grid>
	);
}

Source.defaultProps = {
	knownDevices: [],
	settings: {},
	onChange: function (settings) {},
	onProbe: function (settings, inputs) {},
};

function SourceIcon(props) {
	return <FontAwesomeIcon icon={faUsb} style={{ color: '#FFF' }} {...props} />;
}

const id = 'video4linux2';
const name = <Trans>Hardware device</Trans>;
const capabilities = ['video'];

const func = {
	initSettings,
	createInputs,
};

export { id, name, capabilities, SourceIcon as icon, Source as component, func };
