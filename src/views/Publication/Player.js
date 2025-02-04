import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useLingui } from '@lingui/react';
import { Trans, t } from '@lingui/macro';
import makeStyles from '@mui/styles/makeStyles';
import Backdrop from '@mui/material/Backdrop';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Tab from '@mui/material/Tab';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import Checkbox from '../../misc/Checkbox';
import Dialog from '../../misc/modals/Dialog';
import FormInlineButton from '../../misc/FormInlineButton';
import H from '../../utils/help';
import NotifyContext from '../../contexts/Notify';
import Paper from '../../misc/Paper';
import PaperHeader from '../../misc/PaperHeader';
import PaperFooter from '../../misc/PaperFooter';
import Player from '../../misc/Player';
import Select from '../../misc/Select';
import TabPanel from '../../misc/TabPanel';
import TabsHorizontal from '../../misc/TabsHorizontal';
import TextFieldCopy from '../../misc/TextFieldCopy';

const useStyles = makeStyles((theme) => ({
	gridContainer: {
		paddingTop: '1em',
	},
	playerL1: {
		padding: '4px 1px 4px 9px',
	},
	playerL2: {
		position: 'relative',
		width: '100%',
		paddingTop: '56.25%',
	},
	playerL3: {
		position: 'absolute',
		top: 0,
		left: 0,
		bottom: 0,
		right: 0,
		backgroundColor: theme.palette.common.black,
	},
}));

const logoImageTypes = [
	{ mimetype: 'image/gif', extension: 'gif', maxSize: 1 * 1024 * 1024 },
	{ mimetype: 'image/png', extension: 'png', maxSize: 1 * 1024 * 1024 },
	{ mimetype: 'image/jpeg', extension: 'jpg', maxSize: 1 * 1024 * 1024 },
	{ mimetype: 'image/svg+xml', extension: 'svg', maxSize: 1 * 1024 * 1024 },
];

const logoAcceptString = logoImageTypes.map((t) => t.mimetype).join(',');

export default function Edit(props) {
	const classes = useStyles();
	const navigate = useNavigate();
	const { channelid: _channelid } = useParams();
	const { i18n } = useLingui();
	const address = props.restreamer.Address();
	const iframeCodes = props.restreamer.GetIngestIframeCodes(_channelid);
	const manifest = props.restreamer.GetIngestManifestUrl(_channelid);
	const poster = props.restreamer.GetIngestPosterUrl(_channelid);
	const timeout = React.useRef();
	const notify = React.useContext(NotifyContext);
	const [$player] = React.useState('videojs-public');
	const [$ready, setReady] = React.useState(false);
	const [$state, setState] = React.useState('disconnected');
	const [$data, setData] = React.useState({});
	const [$settings, setSettings] = React.useState({});
	const [$tab, setTab] = React.useState('embed');
	const [$revision, setRevision] = React.useState(0);
	const [$saving, setSaving] = React.useState(false);
	const [$error, setError] = React.useState({
		open: false,
		title: '',
		message: '',
	});

	React.useEffect(() => {
		(async () => {
			await mount();
		})();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const mount = async () => {
		const channelid = props.restreamer.SelectChannel(_channelid);
		if (channelid === '' || channelid !== _channelid) {
			navigate('/', { replace: true });
			return;
		}

		const proc = await props.restreamer.GetIngest(channelid, ['state', 'metadata']);
		if (proc === null) {
			notify.Dispatch('warning', 'notfound:ingest', i18n._(t`Main channel not found`));
			navigate(`/${_channelid}/`);
			return;
		}

		setData(proc.metadata);
		setState(proc.progress.state);
		setSettings(props.restreamer.InitPlayerSettings(proc.metadata.player));

		setReady(true);
	};

	const handleChange = (what, section = '') => (event) => {
		const value = event.target.value;
		const settings = $settings;

		if (section === '') {
			if (['autoplay', 'mute', 'statistics'].includes(what)) {
				settings[what] = !settings[what];
			} else {
				settings[what] = value;
			}
		} else if (section === 'color') {
			settings.color[what] = value;
		} else if (section === 'ga') {
			settings.ga[what] = value;
		} else if (section === 'logo') {
			settings.logo[what] = value;
		}

		if (timeout.current !== null) {
			clearTimeout(timeout.current);
			timeout.current = null;
		}

		timeout.current = setTimeout(() => {
			timeout.current = null;
			setRevision($revision + 1);
		}, 500);

		setSettings({
			...$settings,
			...settings,
		});
	};

	const handleLogoUpload = (event) => {
		const handler = (event) => {
			const files = event.target.files;

			setSaving(true);

			if (files.length === 0) {
				// no files selected
				setSaving(false);
				showUploadError(<Trans>Please select a file to upload.</Trans>);
				return;
			}

			const file = files[0];

			let type = null;
			for (let t of logoImageTypes) {
				if (t.mimetype === file.type) {
					type = t;
					break;
				}
			}

			if (type === null) {
				// not one of the allowed mimetypes
				setSaving(false);
				showUploadError(
					<Trans>
						The selected file type ({file.type}) is now allowed. Allowed file types are {logoAcceptString}
					</Trans>
				);
				return;
			}

			if (file.size > type.maxSize) {
				// the file is too big
				setSaving(false);
				showUploadError(
					<Trans>
						The selected file is too big ({file.size} bytes). Only {type.maxSize} bytes are allowed.
					</Trans>
				);
				return;
			}

			let reader = new FileReader();
			reader.readAsArrayBuffer(file);
			reader.onloadend = async () => {
				if (reader.result === null) {
					// reading the file failed
					setSaving(false);
					showUploadError(<Trans>There was an error during upload: {reader.error.message}</Trans>);
					return;
				}

				const path = await props.restreamer.UploadLogo(_channelid, reader.result, type.extension);

				handleChange(
					'image',
					'logo'
				)({
					target: {
						value: address + path,
					},
				});

				setSaving(false);
			};
		};

		handler(event);

		// reset the value such that the onChange event will be triggered again
		// if the same file gets selected again
		event.target.value = null;
	};

	const showUploadError = (message) => {
		setError({
			...$error,
			open: true,
			title: <Trans>Uploading the logo failed</Trans>,
			message: message,
		});
	};

	const hideUploadError = () => {
		setError({
			...$error,
			open: false,
		});
	};

	const handleDone = async () => {
		setSaving(true);

		const data = {
			...$data,
			player: $settings,
		};

		await props.restreamer.SetIngestMetadata(_channelid, data);
		await props.restreamer.UpdatePlayer(_channelid);

		setSaving(false);

		notify.Dispatch('success', 'save:player', i18n._(t`Player settings saved`));
	};

	const handleChangeTab = (event, value) => {
		setTab(value);
	};

	const handleAbort = () => {
		navigate(`/${_channelid}/`);
	};

	const handleHelp = () => {
		H('player-' + $tab);
	};

	if ($ready === false) {
		return null;
	}

	const channelid = props.restreamer.SelectChannel(_channelid);
	if (channelid === '' || channelid !== _channelid) {
		navigate('/', { replace: true });
		return null;
	}

	return (
		<React.Fragment>
			<Paper xs={12} md={10}>
				<PaperHeader title={<Trans>EDIT: Player</Trans>} onAbort={handleAbort} onHelp={handleHelp} />
				<Grid container spacing={1} className={classes.gridContainer}>
					<Grid item xs={12}>
						<Grid container spacing={0} className={classes.playerL1}>
							<Grid item xs={12} className={classes.playerL2}>
								{$state !== 'connected' ? (
									<Grid container direction="column" className={classes.playerL3} justifyContent="center" alignItems="center" spacing={1}>
										<Grid item>
											<Typography variant="h2">
												<Trans>No video</Trans>
											</Typography>
										</Grid>
									</Grid>
								) : (
									<Player
										key={$revision}
										type={$player}
										source={address + '/' + manifest}
										autoplay={$settings.autoplay}
										mute={$settings.mute}
										poster={address + '/' + poster}
										logo={$settings.logo}
										colors={$settings.color}
										statistics={$settings.statistics}
										controls
									/>
								)}
							</Grid>
						</Grid>
					</Grid>
				</Grid>
				<Grid container spacing={0}>
					<Grid item xs={12}>
						<TabsHorizontal value={$tab} onChange={handleChangeTab}>
							<Tab className="tab" label={<Trans>Embed</Trans>} value="embed" />
							{$player === 'clappr' && <Tab className="tab" label={<Trans>Color</Trans>} value="colors" />}
							<Tab className="tab" label={<Trans>Logo</Trans>} value="logo" />
							{$player === 'clappr' && <Tab className="tab" label={<Trans>Statistics</Trans>} value="statistic" />}
							<Tab className="tab" label={<Trans>Playback</Trans>} value="playback" />
						</TabsHorizontal>
						<TabPanel value={$tab} index="embed">
							<Grid container spacing={2}>
								<Grid item xs={12}>
									<TextFieldCopy label={<Trans>Player URL</Trans>} value={address + '/' + _channelid + '.html'} />
								</Grid>
								<Grid item xs={12}>
									<TextFieldCopy label={<Trans>iframe code</Trans>} value={iframeCodes.join('\n')} />
								</Grid>
							</Grid>
						</TabPanel>
						<TabPanel value={$tab} index="colors">
							<Grid container spacing={2}>
								<Grid item xs={6}>
									<TextField
										variant="outlined"
										fullWidth
										id="color-1"
										label={<Trans>Seekbar color</Trans>}
										value={$settings.color.seekbar}
										onChange={handleChange('seekbar', 'color')}
									/>
								</Grid>
								<Grid item xs={6}>
									<TextField
										variant="outlined"
										fullWidth
										id="color-2"
										label={<Trans>Button color</Trans>}
										value={$settings.color.buttons}
										onChange={handleChange('buttons', 'color')}
									/>
								</Grid>
							</Grid>
						</TabPanel>
						<TabPanel value={$tab} index="logo">
							<Grid container spacing={2}>
								<Grid item xs={12} md={9}>
									<TextField
										variant="outlined"
										fullWidth
										id="image-url"
										label={<Trans>Image URL</Trans>}
										value={$settings.logo.image}
										onChange={handleChange('image', 'logo')}
									/>
								</Grid>
								<Grid item xs={12} md={3}>
									<FormInlineButton component="label">
										<Trans>Upload</Trans>
										<input accept={logoAcceptString} type="file" hidden onChange={handleLogoUpload} />
									</FormInlineButton>
								</Grid>
								<Grid item xs={12} md={4}>
									<Select
										variant="outlined"
										fullWidth
										label={<Trans>Position</Trans>}
										value={$settings.logo.position}
										onChange={handleChange('position', 'logo')}
									>
										<MenuItem value="top-left">Top-Left</MenuItem>
										<MenuItem value="top-right">Top-Right</MenuItem>
										<MenuItem value="bottom-left">Bottom-Left</MenuItem>
										<MenuItem value="bottom-right">Bottom-Right</MenuItem>
									</Select>
								</Grid>
								<Grid item xs={12} md={8}>
									<TextField
										variant="outlined"
										fullWidth
										id="image-link"
										label={<Trans>Link</Trans>}
										value={$settings.logo.link}
										onChange={handleChange('link', 'logo')}
									/>
								</Grid>
							</Grid>
						</TabPanel>
						<TabPanel value={$tab} index="statistic">
							<Grid container spacing={2}>
								<Grid item xs={12} md={6}>
									<TextField
										variant="outlined"
										fullWidth
										id="ga-id"
										label={<Trans>Google Analytics ID</Trans>}
										value={$settings.gaAccount}
										onChange={handleChange('account', 'ga')}
									/>
								</Grid>
								<Grid item xs={12} md={6}>
									<TextField
										variant="outlined"
										fullWidth
										id="ga-name"
										label={<Trans>Google Analytics Tracker Name</Trans>}
										value={$settings.gaName}
										onChange={handleChange('name', 'ga')}
									/>
								</Grid>
								<Grid item xs={12}>
									<Checkbox
										label={<Trans>Enable nerd statistics</Trans>}
										checked={$settings.statistics}
										onChange={handleChange('statistics')}
									/>
								</Grid>
							</Grid>
						</TabPanel>
						<TabPanel value={$tab} index="playback">
							<Grid container spacing={2}>
								<Grid item xs={12}>
									<Checkbox label={<Trans>Autoplay</Trans>} checked={$settings.autoplay} onChange={handleChange('autoplay')} />
									<Checkbox label={<Trans>Mute</Trans>} checked={$settings.mute} onChange={handleChange('mute')} />
								</Grid>
							</Grid>
						</TabPanel>
					</Grid>
				</Grid>
				<PaperFooter
					buttonsLeft={
						<Button variant="outlined" color="default" onClick={handleAbort}>
							<Trans>Close</Trans>
						</Button>
					}
					buttonsRight={
						<Button variant="outlined" color="primary" onClick={handleDone}>
							<Trans>Save</Trans>
						</Button>
					}
				/>
			</Paper>
			<Backdrop open={$saving}>
				<CircularProgress color="inherit" />
			</Backdrop>
			<Dialog
				open={$error.open}
				title={$error.title}
				onClose={hideUploadError}
				buttonsRight={
					<Button variant="outlined" color="primary" onClick={hideUploadError}>
						<Trans>OK</Trans>
					</Button>
				}
			>
				<Typography variant="body1">{$error.message}</Typography>
			</Dialog>
		</React.Fragment>
	);
}

Edit.defaultProps = {
	restreamer: null,
};
